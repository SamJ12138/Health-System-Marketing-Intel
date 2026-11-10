// Markdown report: a pure function of what the app is showing.
// Facts are printed with their source links, analysis under an "Analysis"
// heading, and a field that is unknown or missing prints nothing at all.
//
// Every piece of text goes through escapeMarkdown before it is written, and
// a link is only ever built from an address that passed safeHttpUrl. Text
// from live research is model-written, so it must not be able to add a
// heading, a "Verified snapshot" line or a link of its own to the report.

import { safeHttpUrl } from './safeUrl.js';
import { evidenceDateLabel, provenanceLabel } from './format.js';
import { computeStats, snapshotDateRange, formatDateRange } from './dataset.js';
import { summarizeOpportunities } from './opportunities.js';

export const REPORT_TITLE = 'Competitive Intelligence Report — health-system digital marketing (UPMC perspective)';
export const REPORT_DISCLAIMER = 'Independent analysis by Sam Jia. Not affiliated with or endorsed by UPMC. Sources are linked next to each fact.';

const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const has = (v) => typeof v === 'string' && v.trim().length > 0;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function reportFileName(generatedAt) {
  return `competitive-intelligence-report-${localDate(generatedAt)}.md`;
}

/**
 * Plain text for a Markdown document: one line, with the characters that
 * start inline Markdown (emphasis, code, links, HTML, entities, tables)
 * escaped everywhere and block markers escaped at the start.
 */
export function escapeMarkdown(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/[\s\p{Cc}]+/gu, ' ')
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/[*_`[\]<~|]/g, '\\$&')
    .replace(/&(?=#?[A-Za-z0-9]+;)/g, '\\&')
    .replace(/^(#{1,6}(?= |$)|>|[-+](?= )|=+)/, '\\$&')
    .replace(/^(\d+)\.(?= )/, '$1\\.');
}
const md = escapeMarkdown;
const escapeLinkUrl = (url) => url.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');

/** "[title](url)" for an http(s) address, otherwise just the escaped text. */
function link(text, url) {
  const href = safeHttpUrl(url);
  return href ? `[${md(text)}](${escapeLinkUrl(href)})` : md(text);
}

/** "[title](url), publisher, date", or the same without a link when the address is not http(s). */
function sourceText(ev) {
  const title = has(ev.title) ? ev.title : 'Source';
  const meta = [ev.publisher, evidenceDateLabel(ev)].filter(has).map(md).join(', ');
  return [link(title, ev.url), meta].filter(has).join(', ') + (safeHttpUrl(ev.url) ? '' : ' (no link: not an http/https address)');
}

function sources(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) return '';
  return ` Sources: ${evidence.map(sourceText).join('; ')}.`;
}

function analysisList(title, items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  return [`${title}:`, ...items.map((item) => `- ${md(item.text)} [based on ${item.basedOn.map(md).join(', ')}]`), ''];
}

const UNREVIEWED = 'This section was written by a language model with web search and not checked by a person.';

function systemSection(heading, entry, { baseline = false } = {}) {
  const { data, provenance } = entry;
  const out = [heading, '', `_${md(provenanceLabel(provenance))}_`, ''];
  if (provenance.kind === 'live') out.push(UNREVIEWED, '');
  if (data.positioning && has(data.positioning.text)) {
    const quote = has(data.positioning.quote) ? ` In its own words (excerpt): "${md(data.positioning.quote)}".` : '';
    out.push(`**Positioning** ${md(data.positioning.text)}${quote}${sources(data.positioning.evidence)}`, '');
  }
  if (data.channels?.length > 0) {
    out.push('**Channels**', '');
    for (const ch of data.channels) {
      out.push(`- ${link(ch.name, ch.url)}${has(ch.note) ? `: ${md(ch.note)}` : ''}${sources(ch.evidence)}`);
    }
    out.push('');
  }
  if (data.facts?.length > 0) {
    out.push('**Facts**', '');
    for (const fact of data.facts) out.push(`- (${md(fact.id)}) ${md(fact.text)}${sources(fact.evidence)}`);
    out.push('');
  }
  const a = data.analysis || {};
  const analysis = [
    ...analysisList('Strengths', a.strengths),
    ...analysisList('Observable gaps', a.gaps),
    ...(baseline ? [] : analysisList('Opportunities for UPMC', a.opportunitiesForUpmc)),
  ];
  if (analysis.length > 0) {
    out.push('#### Analysis', '', "The author's judgment, not a sourced statement. Fact ids in brackets show what each point rests on.", '', ...analysis);
  }
  return out;
}

function trendSection(trend) {
  const out = [`### ${md(trend.topic)}`, ''];
  if (trend.provenance) out.push(`_${md(provenanceLabel(trend.provenance))}_`, '');
  if (trend.provenance?.kind === 'live') out.push(UNREVIEWED, '');
  if (trend.summary && has(trend.summary.text)) out.push(`${md(trend.summary.text)}${sources(trend.summary.evidence)}`, '');
  if (trend.examples?.length > 0) {
    out.push('**Examples**', '');
    for (const example of trend.examples) out.push(`- ${md(example.text)}${sources(example.evidence)}`);
    out.push('');
  }
  const a = trend.analysis || {};
  const judgments = [
    has(a.relevance) && `Relevance: ${md(a.relevance)}`,
    has(a.effort) && `Effort: ${md(a.effort)}`,
    has(trend.channel) && `Channel: ${md(trend.channel)}`,
  ].filter(Boolean);
  const analysis = [];
  if (judgments.length > 0) analysis.push(`- ${judgments.join(' · ')}`);
  if (has(a.note)) analysis.push(`- Reading of the evidence: ${md(a.note)}`);
  if (has(a.recommendation)) analysis.push(`- Recommendation for UPMC: ${md(a.recommendation)}`);
  const challenges = Array.isArray(a.challenges) ? a.challenges.filter(has) : [];
  if (challenges.length > 0) analysis.push(`- Challenges: ${challenges.map(md).join('; ')}`);
  if (analysis.length > 0) out.push('#### Analysis', '', "The author's judgment, not a sourced statement.", '', ...analysis, '');
  return out;
}

const isLive = (x) => x?.provenance?.kind === 'live';

function contentLine({ entries, homeEntry, trends }) {
  const range = formatDateRange(snapshotDateRange({ entries, homeEntry, trends }));
  const anyLive = [...Object.values(entries), ...trends].some(isLive);
  const live = 'live research results marked "unreviewed" (written by a language model with web search and not checked by a person)';
  if (range && anyLive) return `Content: verified snapshot of ${range}, and ${live}.`;
  if (range) return `Content: verified snapshot of ${range}.`;
  if (anyLive) return `Content: ${live}.`;
  return 'Content: no verified snapshot is loaded and no live research has been run, so this report has no findings.';
}

function opportunityLine(op) {
  const known = [
    has(op.channel) && `Channel: ${md(op.channel)}`,
    has(op.effort) && `Effort: ${md(op.effort)}`,
    has(op.impact) && `Impact: ${md(op.impact)}`,
  ].filter(Boolean);
  let line = `- **${md(op.title)}**`;
  if (has(op.description)) line += `: ${md(op.description)}`;
  if (Array.isArray(op.basedOn) && op.basedOn.length > 0) line += ` [based on ${op.basedOn.map(md).join(', ')}]`;
  if (known.length > 0) line += ` (${known.join('; ')})`;
  if (op.unreviewed) line += ' (from live research, unreviewed)';
  return line;
}

/** The summary counts the verified snapshot only; live research is listed on its own line. */
function summaryLines({ competitors, entries, homeEntry, trends, opportunities }) {
  const verifiedEntries = Object.fromEntries(Object.entries(entries).filter(([, e]) => !isLive(e)));
  const liveEntries = Object.values(entries).filter(isLive);
  const verified = computeStats({ competitors, entries: verifiedEntries, homeEntry, trends: trends.filter((t) => !isLive(t)) });
  const liveTrends = trends.filter(isLive).length;
  const out = [
    `- Systems with verified data: ${verified.systemsWithData} of ${verified.systemsTracked}`,
    `- Verified facts: ${verified.facts}, each with one or more linked sources (${plural(verified.sources, 'distinct source address', 'distinct source addresses')} in total)`,
    `- Verified trends: ${verified.trends}`,
  ];
  if (liveEntries.length > 0 || liveTrends > 0) {
    const liveFacts = liveEntries.reduce((n, e) => n + (e.data.facts?.length || 0), 0);
    const parts = [
      liveEntries.length > 0 && `${plural(liveFacts, 'fact', 'facts')} for ${plural(liveEntries.length, 'system', 'systems')}`,
      liveTrends > 0 && plural(liveTrends, 'trend', 'trends'),
    ].filter(Boolean);
    out.push(`- Live research, unreviewed and not counted above: ${parts.join(', ')}`);
  }
  if (opportunities.length > 0) {
    const s = summarizeOpportunities(opportunities);
    const details = [s.highImpact > 0 && `${s.highImpact} high impact`, s.quickWins > 0 && plural(s.quickWins, 'quick win', 'quick wins')].filter(Boolean);
    out.push(`- Saved opportunities: ${s.total}${details.length ? ` (${details.join(', ')})` : ''}`);
  }
  return out;
}

export function buildReport({ competitors, homeSystem = null, homeEntry = null, entries, trends, opportunities = [], generatedAt }) {
  const out = [`# ${REPORT_TITLE}`, '', REPORT_DISCLAIMER, '', `Generated: ${localDate(generatedAt)}`, '', contentLine({ entries, homeEntry, trends }), ''];

  out.push('## Summary', '', ...summaryLines({ competitors, entries, homeEntry, trends, opportunities }), '');

  if (homeSystem && homeEntry) {
    out.push(...systemSection(`## Baseline system: ${md(homeSystem.name)}`, homeEntry, { baseline: true }));
  }

  const withData = competitors.filter((c) => entries[c.id]);
  if (withData.length > 0) {
    out.push('## Competitors', '');
    for (const comp of withData) out.push(...systemSection(`### ${md(comp.name)}`, entries[comp.id]));
  }
  const withoutData = competitors.filter((c) => !entries[c.id]);
  if (withoutData.length > 0 && withData.length > 0) {
    out.push(`No verified data yet for: ${withoutData.map((c) => md(c.name)).join(', ')}.`, '');
  }

  if (trends.length > 0) {
    out.push('## Trends', '');
    for (const trend of trends) out.push(...trendSection(trend));
  }

  if (opportunities.length > 0) {
    out.push('## Saved opportunities', '', "Analysis: the author's judgment, saved from the sections above.", '');
    out.push(...opportunities.map(opportunityLine), '');
  }

  out.push('---', '', REPORT_DISCLAIMER, '');
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
