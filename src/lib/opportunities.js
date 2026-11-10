// Saved opportunities: pure functions over the data the app holds.
// An opportunity is analysis (the author's judgment). Fields nobody stated
// stay null; nothing is filled in with a default.

const IMPACT_BY_RELEVANCE = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

export function impactFromRelevance(relevance) {
  return IMPACT_BY_RELEVANCE[relevance] ?? null;
}

/**
 * Build the opportunity that a bookmark id ("comp-<id>" or "trend-<id>") stands for, or null.
 * context: { competitors, entries, trends } as the app holds them.
 */
export function buildOpportunity(id, { competitors, entries, trends }) {
  if (id.startsWith('comp-')) {
    const compId = id.slice('comp-'.length);
    const comp = competitors.find((c) => c.id === compId);
    const entry = entries[compId];
    const first = entry?.data?.analysis?.opportunitiesForUpmc?.[0];
    if (!comp || !first) return null;
    return {
      id,
      title: `${comp.name}: opportunity for UPMC`,
      description: first.text,
      basedOn: [...first.basedOn],
      channel: null,
      effort: null,
      impact: null,
      source: 'competitor',
      unreviewed: entry.provenance?.kind === 'live',
    };
  }
  if (id.startsWith('trend-')) {
    const trendId = id.slice('trend-'.length);
    const trend = trends.find((t) => t.id === trendId);
    if (!trend) return null;
    return {
      id,
      title: trend.topic,
      description: trend.analysis?.recommendation || '',
      channel: trend.channel ?? null,
      effort: trend.analysis?.effort ?? null,
      impact: impactFromRelevance(trend.analysis?.relevance),
      source: 'trend',
      unreviewed: trend.provenance?.kind === 'live',
    };
  }
  return null;
}

/** Whether a bookmark id can be saved at all with the current data. */
export function canSave(id, context) {
  return buildOpportunity(id, context) !== null;
}

/** Add the opportunity for `id` if it is not saved yet, otherwise remove it. */
export function toggleOpportunity(opportunities, id, context) {
  if (opportunities.some((o) => o.id === id)) return opportunities.filter((o) => o.id !== id);
  const created = buildOpportunity(id, context);
  return created ? [...opportunities, created] : opportunities;
}

/** An empty filter value means "any". An opportunity with an unknown value never matches a set filter. */
export function filterOpportunities(opportunities, filters) {
  return opportunities.filter((op) => {
    if (filters.channel && op.channel !== filters.channel) return false;
    if (filters.effort && op.effort !== filters.effort) return false;
    if (filters.impact && op.impact !== filters.impact) return false;
    return true;
  });
}

export function summarizeOpportunities(opportunities) {
  return {
    total: opportunities.length,
    highImpact: opportunities.filter((o) => o.impact === 'High').length,
    quickWins: opportunities.filter((o) => o.effort === 'Quick Win').length,
    strategic: opportunities.filter((o) => o.effort === 'Strategic Initiative').length,
  };
}
