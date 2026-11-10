// Turns the raw JSON modules found by import.meta.glob into what the app
// renders. Files that fail validation are not shown at all.

import { validateCompetitorFile, validateTrendsFile, formatProblems } from './validateSnapshot.js';

const idFromPath = (path) => path.split('/').pop().replace(/\.json$/, '');

export function buildDataset({ competitorList, homeSystem = null, competitorFiles = {}, trendsFiles = {}, isFixture = false }) {
  const knownIds = competitorList.map((c) => c.id);
  const entries = {};
  const invalid = [];
  let homeEntry = null;

  for (const [path, data] of Object.entries(competitorFiles)) {
    const id = idFromPath(path);
    const isHome = homeSystem !== null && id === homeSystem.id;
    const result = validateCompetitorFile(data, {
      expectedId: id,
      knownIds: isHome ? [homeSystem.id] : knownIds,
      home: isHome,
    });
    if (!result.ok) { invalid.push({ file: path, problems: formatProblems(result.errors) }); continue; }
    const entry = { data, provenance: { kind: 'snapshot', asOf: data.asOf } };
    if (isHome) homeEntry = entry; else entries[id] = entry;
  }

  let trends = [];
  for (const [path, data] of Object.entries(trendsFiles)) {
    const result = validateTrendsFile(data);
    if (!result.ok) { invalid.push({ file: path, problems: formatProblems(result.errors) }); continue; }
    trends = data.map((trend) => ({ ...trend, provenance: { kind: 'snapshot', asOf: trend.asOf } }));
  }

  return { competitors: competitorList, homeSystem, entries, homeEntry, trends, invalid, isFixture };
}

function evidenceUrlsOfSystem(data, into) {
  const add = (list) => (list || []).forEach((ev) => ev?.url && into.add(ev.url));
  add(data.positioning?.evidence);
  (data.facts || []).forEach((f) => add(f.evidence));
  (data.channels || []).forEach((ch) => add(ch.evidence));
}

function evidenceUrlsOfTrend(trend, into) {
  const add = (list) => (list || []).forEach((ev) => ev?.url && into.add(ev.url));
  add(trend.summary?.evidence);
  (trend.examples || []).forEach((ex) => add(ex.evidence));
}

/** Numbers shown on the landing page and in the report. All computed from what is loaded. */
export function computeStats({ competitors, entries, homeEntry = null, trends = [] }) {
  const systems = Object.values(entries);
  const all = homeEntry ? [...systems, homeEntry] : systems;
  const urls = new Set();
  all.forEach((e) => evidenceUrlsOfSystem(e.data, urls));
  trends.forEach((t) => evidenceUrlsOfTrend(t, urls));
  return {
    systemsTracked: competitors.length,
    systemsWithData: competitors.filter((c) => entries[c.id]).length,
    facts: all.reduce((n, e) => n + (e.data.facts?.length || 0), 0),
    sources: urls.size,
    trends: trends.length,
  };
}

/** Earliest and latest asOf among everything that came from the verified snapshot. */
export function snapshotDateRange({ entries, homeEntry = null, trends = [] }) {
  const dates = [
    ...Object.values(entries).map((e) => e.provenance),
    ...(homeEntry ? [homeEntry.provenance] : []),
    ...trends.map((t) => t.provenance),
  ].filter((p) => p?.kind === 'snapshot' && p.asOf).map((p) => p.asOf).sort();
  if (dates.length === 0) return null;
  return { from: dates[0], to: dates[dates.length - 1] };
}

export function formatDateRange(range) {
  if (!range) return null;
  return range.from === range.to ? range.to : `${range.from} to ${range.to}`;
}
