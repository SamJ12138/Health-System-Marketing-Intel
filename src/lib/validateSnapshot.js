// Validator for the verified-snapshot schema (see docs/data-schema.md).
// Plain JS on purpose: it runs in the browser on every loaded file, in the
// unit test that guards the repository, and on live-research answers.

import { isHttpsUrl } from './safeUrl.js';

export const FACT_CATEGORIES = ['campaign', 'content', 'channel', 'metric', 'program', 'recognition'];
export const TREND_CHANNELS = ['Email', 'Social', 'Search', 'Content', 'Paid', 'Marketing Technology'];
export const RELEVANCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];
export const EFFORT_LEVELS = ['Quick Win', 'Medium', 'Strategic Initiative'];
export const MAX_QUOTE_LENGTH = 240;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim().length > 0;

/** True for a real calendar date written YYYY-MM-DD. */
export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** "published" is what the page states: a full date, a year-month, a year, or null (unknown). */
export function isPublishedValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string') return false;
  if (/^\d{4}$/.test(value)) return true;
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return true;
  return isIsoDate(value);
}

function collector() {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    error: (path, message) => errors.push({ path, message }),
    warn: (path, message) => warnings.push({ path, message }),
    result: () => ({ ok: errors.length === 0, errors, warnings }),
  };
}

function checkEvidence(ev, path, c) {
  if (!isObject(ev)) { c.error(path, 'evidence must be an object'); return; }
  if (!isHttpsUrl(ev.url)) c.error(`${path}.url`, 'must be an https URL');
  if (!isText(ev.title)) c.error(`${path}.title`, 'required');
  if (!isText(ev.publisher)) c.error(`${path}.publisher`, 'required');
  if (!isPublishedValue(ev.published)) c.error(`${path}.published`, 'must be YYYY-MM-DD, YYYY-MM, YYYY or null');
  if (!isIsoDate(ev.accessed)) c.error(`${path}.accessed`, 'must be an ISO date (YYYY-MM-DD)');
  if (ev.quote !== undefined && ev.quote !== null) {
    if (typeof ev.quote !== 'string') c.error(`${path}.quote`, 'must be a string');
    else if (ev.quote.length > MAX_QUOTE_LENGTH) c.error(`${path}.quote`, `longer than ${MAX_QUOTE_LENGTH} characters (${ev.quote.length})`);
  }
}

function checkEvidenceList(list, path, c) {
  if (!Array.isArray(list) || list.length === 0) {
    c.error(path, 'at least one evidence entry with an https URL is required');
    return;
  }
  list.forEach((ev, i) => checkEvidence(ev, `${path}[${i}]`, c));
}

function checkSourcedText(node, path, c) {
  if (!isObject(node)) { c.error(path, 'required'); return; }
  if (!isText(node.text)) c.error(`${path}.text`, 'required');
  checkEvidenceList(node.evidence, `${path}.evidence`, c);
}

function checkCount(list, path, min, max, c) {
  if (Array.isArray(list) && (list.length < min || list.length > max)) {
    c.warn(path, `schema asks for ${min} to ${max} items, found ${list.length}`);
  }
}

function checkAnalysisList(list, path, factIds, c) {
  if (!Array.isArray(list)) { c.error(path, 'must be an array'); return; }
  list.forEach((item, i) => {
    const p = `${path}[${i}]`;
    if (!isObject(item)) { c.error(p, 'must be an object'); return; }
    if (!isText(item.text)) c.error(`${p}.text`, 'required');
    if (!Array.isArray(item.basedOn) || item.basedOn.length === 0) {
      c.error(`${p}.basedOn`, 'an analysis item must point at one or more fact ids');
      return;
    }
    item.basedOn.forEach((id, j) => {
      if (!factIds.has(id)) c.error(`${p}.basedOn[${j}]`, `"${id}" is not a fact id in this file`);
    });
  });
}

/**
 * Validate one system file.
 * options.expectedId: id implied by the file name.
 * options.knownIds:   ids the app knows (competitor list plus home system).
 * options.home:       true for the home-system profile (no opportunitiesForUpmc).
 * options.live:       true for a filtered live-research answer, which may have
 *                     lost its positioning; everything that remains is held
 *                     to the same rules.
 */
export function validateCompetitorFile(data, options = {}) {
  const { expectedId, knownIds, home = false, live = false } = options;
  const c = collector();
  if (!isObject(data)) { c.error('', 'file must contain a JSON object'); return c.result(); }

  if (!isText(data.id)) c.error('id', 'required');
  else {
    if (expectedId !== undefined && data.id !== expectedId) c.error('id', `"${data.id}" does not match the file name "${expectedId}"`);
    if (knownIds && !knownIds.includes(data.id)) c.error('id', `"${data.id}" is not in the competitor list`);
  }
  if (!isText(data.name)) c.error('name', 'required');
  if (!isIsoDate(data.asOf)) c.error('asOf', 'must be an ISO date (YYYY-MM-DD)');

  if (!(live && (data.positioning === undefined || data.positioning === null))) checkSourcedText(data.positioning, 'positioning', c);
  if (isObject(data.positioning) && data.positioning.quote !== undefined && data.positioning.quote !== null
    && typeof data.positioning.quote !== 'string') c.error('positioning.quote', 'must be a string');

  const factIds = new Set();
  if (!Array.isArray(data.facts) || data.facts.length === 0) c.error('facts', 'at least one fact is required');
  else {
    checkCount(data.facts, 'facts', 5, 10, c);
    data.facts.forEach((fact, i) => {
      const p = `facts[${i}]`;
      if (!isObject(fact)) { c.error(p, 'must be an object'); return; }
      if (!isText(fact.id)) c.error(`${p}.id`, 'required');
      else if (factIds.has(fact.id)) c.error(`${p}.id`, `duplicate fact id "${fact.id}"`);
      else factIds.add(fact.id);
      if (!FACT_CATEGORIES.includes(fact.category)) c.error(`${p}.category`, `must be one of: ${FACT_CATEGORIES.join(', ')}`);
      if (!isText(fact.text)) c.error(`${p}.text`, 'required');
      checkEvidenceList(fact.evidence, `${p}.evidence`, c);
    });
  }

  if (!Array.isArray(data.channels)) c.error('channels', 'must be an array');
  else {
    data.channels.forEach((ch, i) => {
      const p = `channels[${i}]`;
      if (!isObject(ch)) { c.error(p, 'must be an object'); return; }
      if (!isText(ch.name)) c.error(`${p}.name`, 'required');
      if (!isHttpsUrl(ch.url)) c.error(`${p}.url`, 'must be an https URL');
      if (ch.note !== undefined && ch.note !== null && typeof ch.note !== 'string') c.error(`${p}.note`, 'must be a string');
      checkEvidenceList(ch.evidence, `${p}.evidence`, c);
    });
  }

  if (!isObject(data.analysis)) c.error('analysis', 'required');
  else {
    checkAnalysisList(data.analysis.strengths, 'analysis.strengths', factIds, c);
    checkCount(data.analysis.strengths, 'analysis.strengths', 2, 4, c);
    checkAnalysisList(data.analysis.gaps, 'analysis.gaps', factIds, c);
    checkCount(data.analysis.gaps, 'analysis.gaps', 0, 3, c);
    if (home) {
      if (data.analysis.opportunitiesForUpmc !== undefined) {
        c.warn('analysis.opportunitiesForUpmc', 'not part of the home-system profile; ignored');
      }
    } else {
      checkAnalysisList(data.analysis.opportunitiesForUpmc, 'analysis.opportunitiesForUpmc', factIds, c);
      checkCount(data.analysis.opportunitiesForUpmc, 'analysis.opportunitiesForUpmc', 2, 4, c);
    }
  }
  return c.result();
}

/** Validate one trend object. `path` prefixes the reported locations. */
export function validateTrend(trend, path = '') {
  const c = collector();
  const at = (key) => (path ? `${path}.${key}` : key);
  if (!isObject(trend)) { c.error(path, 'must be an object'); return c.result(); }
  if (!isText(trend.id)) c.error(at('id'), 'required');
  if (!isText(trend.topic)) c.error(at('topic'), 'required');
  if (!isIsoDate(trend.asOf)) c.error(at('asOf'), 'must be an ISO date (YYYY-MM-DD)');
  checkSourcedText(trend.summary, at('summary'), c);
  if (!Array.isArray(trend.examples)) c.error(at('examples'), 'must be an array');
  else {
    checkCount(trend.examples, at('examples'), 2, 4, c);
    trend.examples.forEach((ex, i) => checkSourcedText(ex, `${at('examples')}[${i}]`, c));
  }
  if (!TREND_CHANNELS.includes(trend.channel)) c.error(at('channel'), `must be one of: ${TREND_CHANNELS.join(', ')}`);
  const a = trend.analysis;
  if (!isObject(a)) c.error(at('analysis'), 'required');
  else {
    if (!RELEVANCE_LEVELS.includes(a.relevance)) c.error(at('analysis.relevance'), `must be one of: ${RELEVANCE_LEVELS.join(', ')}`);
    if (!EFFORT_LEVELS.includes(a.effort)) c.error(at('analysis.effort'), `must be one of: ${EFFORT_LEVELS.join(', ')}`);
    if (!isText(a.recommendation)) c.error(at('analysis.recommendation'), 'required');
    if (!Array.isArray(a.challenges) || a.challenges.some((ch) => !isText(ch))) c.error(at('analysis.challenges'), 'must be an array of strings');
    // Optional: the author's reading of the evidence. It lives here, under analysis, so it is never shown as a sourced statement.
    if (a.note !== undefined && a.note !== null && !isText(a.note)) c.error(at('analysis.note'), 'must be a non-empty string when present');
  }
  return c.result();
}

/** Validate trends.json (an array of trends with unique ids). */
export function validateTrendsFile(data) {
  const c = collector();
  if (!Array.isArray(data)) { c.error('', 'file must contain a JSON array'); return c.result(); }
  const ids = new Set();
  data.forEach((trend, i) => {
    const r = validateTrend(trend, `[${i}]`);
    c.errors.push(...r.errors);
    c.warnings.push(...r.warnings);
    if (isObject(trend) && isText(trend.id)) {
      if (ids.has(trend.id)) c.error(`[${i}].id`, `duplicate trend id "${trend.id}"`);
      ids.add(trend.id);
    }
  });
  return c.result();
}

/** Single-evidence check for callers that filter items one by one (live research). */
export function evidenceProblems(ev) {
  const c = collector();
  checkEvidence(ev, 'evidence', c);
  return c.errors;
}

export function formatProblems(problems) {
  return problems.map((p) => (p.path ? `${p.path}: ${p.message}` : p.message));
}
