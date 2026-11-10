// Live research: ask the model for the snapshot schema, keep only what has a
// usable source link, and run the result through the same validator as the
// verified snapshot. Whatever is shown is marked "unreviewed" by its provenance.
//
// Every string that comes back is model-written. Before it is kept, all
// whitespace (line breaks included) is collapsed to single spaces, so no value
// can span lines when it is later written into the Markdown report.

import { requestResearch, LiveResearchError, TRUNCATING_STOP_REASONS, DEFAULT_MODEL } from './anthropicClient.js';
import { extractAnswer, collectSearchUrls, collectSearchErrors } from './parseResponse.js';
import { buildCompetitorPrompt, buildTrendPrompt } from './prompts.js';
import {
  validateCompetitorFile, validateTrend, evidenceProblems, isPublishedValue,
  formatProblems, FACT_CATEGORIES, MAX_QUOTE_LENGTH,
} from './validateSnapshot.js';
import { comparableUrl, safeHttpUrl } from './safeUrl.js';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** One line of plain text: control characters and every run of whitespace become a single space. */
export function oneLine(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\s\p{Cc}]+/gu, ' ').trim();
}
const isText = (v) => oneLine(v).length > 0;
const FACT_ID = /^[A-Za-z0-9_-]{1,16}$/;
const MODEL_ID = /^[A-Za-z0-9._:@/-]{1,80}$/;

/**
 * Evidence entries that can be shown: https, well-formed, and (when the set of
 * returned search addresses is known) actually returned by the search tool in
 * this run. Fields the model has no way to know better than we do are filled
 * in mechanically: the access date is today, a missing publisher is the host.
 */
function usableEvidence(list, { today, returned }) {
  if (!Array.isArray(list)) return [];
  const kept = [];
  for (const raw of list) {
    if (!isObject(raw)) continue;
    const href = safeHttpUrl(raw.url);
    if (!href) continue;
    if (returned && !returned.has(comparableUrl(href))) continue;
    const host = new URL(href).hostname.replace(/^www\./, '');
    const ev = {
      url: href, // the parsed, normalised address, never the raw string
      title: oneLine(raw.title) || host,
      publisher: oneLine(raw.publisher) || host,
      published: isPublishedValue(raw.published) ? (raw.published ?? null) : null,
      accessed: today,
    };
    const quote = oneLine(raw.quote);
    if (quote && quote.length <= MAX_QUOTE_LENGTH) ev.quote = quote;
    if (evidenceProblems(ev).length === 0) kept.push(ev);
  }
  return kept;
}

function sourcedText(node, ctx) {
  if (!isObject(node) || !isText(node.text)) return null;
  const evidence = usableEvidence(node.evidence, ctx);
  return evidence.length ? { text: oneLine(node.text), evidence } : null;
}

function analysisItems(list, factIds, dropped) {
  if (!Array.isArray(list)) return [];
  const kept = [];
  for (const item of list) {
    const ok = isObject(item) && isText(item.text) && Array.isArray(item.basedOn) && item.basedOn.length > 0
      && item.basedOn.every((id) => factIds.has(id));
    if (ok) kept.push({ text: oneLine(item.text), basedOn: [...item.basedOn] });
    else dropped.analysis += 1;
  }
  return kept;
}

/**
 * Filter a model answer for one system. Returns { data, dropped } or throws
 * LiveResearchError('empty' | 'validation').
 * dropped.statements counts facts, channels and the positioning that had no
 * usable source; dropped.analysis counts analysis points that had no basis left.
 */
export function sanitizeCompetitorAnswer(raw, { competitor, today, searchUrls }) {
  if (!isObject(raw)) throw new LiveResearchError('parse');
  const returned = Array.isArray(searchUrls) ? new Set(searchUrls.map(comparableUrl).filter(Boolean)) : null;
  const ctx = { today, returned };
  const dropped = { statements: 0, analysis: 0 };

  const data = { id: competitor.id, name: competitor.name, asOf: today };

  if (raw.positioning !== undefined && raw.positioning !== null) {
    const positioning = sourcedText(raw.positioning, ctx);
    if (positioning) {
      const quote = oneLine(raw.positioning.quote);
      data.positioning = { text: positioning.text, ...(quote ? { quote } : {}), evidence: positioning.evidence };
    } else dropped.statements += 1;
  }

  data.facts = [];
  const factIds = new Set();
  for (const fact of Array.isArray(raw.facts) ? raw.facts : []) {
    const sourced = sourcedText(fact, ctx);
    const ok = sourced && typeof fact.id === 'string' && FACT_ID.test(fact.id) && !factIds.has(fact.id)
      && FACT_CATEGORIES.includes(fact.category);
    if (!ok) { dropped.statements += 1; continue; }
    factIds.add(fact.id);
    data.facts.push({ id: fact.id, category: fact.category, text: sourced.text, evidence: sourced.evidence });
  }

  data.channels = [];
  for (const ch of Array.isArray(raw.channels) ? raw.channels : []) {
    const evidence = isObject(ch) ? usableEvidence(ch.evidence, ctx) : [];
    const href = isObject(ch) ? safeHttpUrl(ch.url) : null;
    if (!isObject(ch) || !isText(ch.name) || !href || !href.startsWith('https://') || evidence.length === 0) { dropped.statements += 1; continue; }
    const note = oneLine(ch.note);
    data.channels.push({ name: oneLine(ch.name), url: href, ...(note ? { note } : {}), evidence });
  }

  const analysis = isObject(raw.analysis) ? raw.analysis : {};
  data.analysis = {
    strengths: analysisItems(analysis.strengths, factIds, dropped),
    gaps: analysisItems(analysis.gaps, factIds, dropped),
    opportunitiesForUpmc: analysisItems(analysis.opportunitiesForUpmc, factIds, dropped),
  };

  if (data.facts.length === 0) throw new LiveResearchError('empty');
  const check = validateCompetitorFile(data, { expectedId: competitor.id, live: true });
  if (!check.ok) throw new LiveResearchError('validation', { detail: formatProblems(check.errors).slice(0, 3).join('; ') });
  return { data, dropped };
}

/** Filter a model answer for one trend. Returns { trend, dropped } or throws. */
export function sanitizeTrendAnswer(raw, { id, today, searchUrls }) {
  if (!isObject(raw)) throw new LiveResearchError('parse');
  const returned = Array.isArray(searchUrls) ? new Set(searchUrls.map(comparableUrl).filter(Boolean)) : null;
  const ctx = { today, returned };
  const dropped = { statements: 0, analysis: 0 };

  const summary = sourcedText(raw.summary, ctx);
  if (!summary) throw new LiveResearchError('empty');
  const examples = [];
  for (const example of Array.isArray(raw.examples) ? raw.examples : []) {
    const sourced = sourcedText(example, ctx);
    if (sourced) examples.push(sourced); else dropped.statements += 1;
  }
  const a = isObject(raw.analysis) ? raw.analysis : {};
  const note = oneLine(a.note);
  const trend = {
    id,
    topic: oneLine(raw.topic),
    asOf: today,
    summary,
    examples,
    channel: raw.channel,
    analysis: {
      relevance: a.relevance,
      effort: a.effort,
      ...(note ? { note } : {}),
      recommendation: oneLine(a.recommendation),
      challenges: Array.isArray(a.challenges) ? a.challenges.map(oneLine).filter(Boolean) : [],
    },
  };
  const check = validateTrend(trend);
  if (!check.ok) throw new LiveResearchError('validation', { detail: formatProblems(check.errors).slice(0, 3).join('; ') });
  return { trend, dropped };
}

async function ask({ prompt, apiKey, model, fetchImpl, signal, requiredKeys }) {
  const { blocks, stopReason, model: reportedModel } = await requestResearch({ prompt, apiKey, model, fetchImpl, signal });
  // requiredKeys keeps a cut-off answer from being read as one of its own inner objects.
  const answer = extractAnswer(blocks, { requiredKeys });
  if (!answer) {
    if (TRUNCATING_STOP_REASONS.has(stopReason)) throw new LiveResearchError('truncated');
    const searchErrors = collectSearchErrors(blocks);
    throw new LiveResearchError('parse', {
      detail: searchErrors.length ? `The web search tool reported: ${[...new Set(searchErrors)].join(', ')}.` : undefined,
    });
  }
  // The model name in the response is shown in the badge and the report; accept it only if it looks like an id.
  const usedModel = typeof reportedModel === 'string' && MODEL_ID.test(reportedModel) ? reportedModel : model;
  return { answer, searchUrls: collectSearchUrls(blocks), model: usedModel };
}

/** Research one system. Resolves to an entry { data, provenance } for the card. */
export async function researchCompetitor({ competitor, apiKey, model = DEFAULT_MODEL, fetchImpl, signal, now = new Date() }) {
  const today = localDate(now);
  const { answer, searchUrls, model: usedModel } = await ask({
    prompt: buildCompetitorPrompt(competitor, today), apiKey, model, fetchImpl, signal, requiredKeys: ['facts'],
  });
  const { data, dropped } = sanitizeCompetitorAnswer(answer, { competitor, today, searchUrls });
  return { data, provenance: { kind: 'live', fetchedAt: now.toISOString(), model: usedModel, dropped } };
}

/** Research one trend topic. Resolves to a trend object with live provenance. */
export async function researchTrend({ query, apiKey, model = DEFAULT_MODEL, fetchImpl, signal, now = new Date() }) {
  const today = localDate(now);
  const { answer, searchUrls, model: usedModel } = await ask({
    prompt: buildTrendPrompt(query, today), apiKey, model, fetchImpl, signal, requiredKeys: ['topic', 'summary'],
  });
  const { trend, dropped } = sanitizeTrendAnswer(answer, { id: `live-${now.getTime()}`, today, searchUrls });
  return { ...trend, provenance: { kind: 'live', fetchedAt: now.toISOString(), model: usedModel, dropped } };
}

/** Message for the UI. Anything that is not a LiveResearchError is reported without details. */
export function describeError(error) {
  if (error instanceof LiveResearchError) return { kind: error.kind, message: error.message };
  return { kind: 'unexpected', message: 'Live research failed unexpectedly.' };
}

/** One line for the card about what the filter removed. */
export function droppedSummary(dropped) {
  if (!dropped) return null;
  const { statements = 0, analysis = 0 } = dropped;
  if (statements === 0 && analysis === 0) return 'No statements were dropped: each one links to a page the search returned.';
  const parts = [];
  if (statements > 0) parts.push(`${statements} statement${statements === 1 ? '' : 's'} dropped (no usable source link)`);
  if (analysis > 0) parts.push(`${analysis} analysis point${analysis === 1 ? '' : 's'} dropped (no sourced fact left to rest on)`);
  return `${parts.join('; ')}.`;
}
