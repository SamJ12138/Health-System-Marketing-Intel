import { describe, it, expect } from 'vitest';
import {
  buildOpportunity, toggleOpportunity, filterOpportunities, summarizeOpportunities, impactFromRelevance,
} from '../../src/lib/opportunities';

const context = {
  competitors: [{ id: 'example-health', name: 'Example Health (fictional)' }],
  entries: {
    'example-health': {
      data: {
        positioning: { text: 'Positioning text' },
        analysis: { opportunitiesForUpmc: [{ text: 'First opportunity', basedOn: ['f1'] }] },
      },
    },
  },
  trends: [{ id: 't1', topic: 'Topic', channel: 'Search', analysis: { recommendation: 'Do the thing', effort: 'Quick Win', relevance: 'HIGH' } }],
};

describe('opportunities', () => {
  it('builds an opportunity from a competitor bookmark, with effort and impact left unknown', () => {
    const op = buildOpportunity('comp-example-health', context);
    expect(op).toEqual({
      id: 'comp-example-health',
      title: 'Example Health (fictional): opportunity for UPMC',
      description: 'First opportunity',
      basedOn: ['f1'],
      channel: null,
      effort: null,
      impact: null,
      source: 'competitor',
      unreviewed: false,
    });
  });

  it('does not save a competitor that has no opportunity in its analysis', () => {
    const bare = { ...context, entries: { 'example-health': { data: { positioning: { text: 'Positioning text' }, analysis: { opportunitiesForUpmc: [] } } } } };
    expect(buildOpportunity('comp-example-health', bare)).toBeNull();
  });

  it('marks opportunities that come from live research', () => {
    const live = { ...context, entries: { 'example-health': { ...context.entries['example-health'], provenance: { kind: 'live' } } } };
    expect(buildOpportunity('comp-example-health', live).unreviewed).toBe(true);
  });

  it('builds an opportunity from a trend bookmark', () => {
    expect(buildOpportunity('trend-t1', context)).toMatchObject({
      title: 'Topic', description: 'Do the thing', channel: 'Search', effort: 'Quick Win', impact: 'High', source: 'trend', unreviewed: false,
    });
  });

  it('returns null for ids it cannot resolve', () => {
    expect(buildOpportunity('comp-nope', context)).toBeNull();
    expect(buildOpportunity('trend-nope', context)).toBeNull();
    expect(buildOpportunity('other', context)).toBeNull();
  });

  it('toggles: adds once, then removes', () => {
    const added = toggleOpportunity([], 'trend-t1', context);
    expect(added).toHaveLength(1);
    expect(toggleOpportunity(added, 'trend-t1', context)).toEqual([]);
    expect(toggleOpportunity([], 'comp-nope', context)).toEqual([]);
  });

  it('filters and summarises', () => {
    const ops = [
      { id: 'a', channel: 'Search', effort: 'Quick Win', impact: 'High' },
      { id: 'b', channel: 'Email', effort: 'Strategic Initiative', impact: 'Low' },
    ];
    expect(filterOpportunities(ops, { channel: 'Search', effort: '', impact: '' }).map((o) => o.id)).toEqual(['a']);
    expect(filterOpportunities(ops, { channel: '', effort: '', impact: 'Low' }).map((o) => o.id)).toEqual(['b']);
    expect(summarizeOpportunities(ops)).toEqual({ total: 2, highImpact: 1, quickWins: 1, strategic: 1 });
  });

  it('maps relevance to impact, and unknown stays unknown', () => {
    expect(impactFromRelevance('HIGH')).toBe('High');
    expect(impactFromRelevance('MEDIUM')).toBe('Medium');
    expect(impactFromRelevance('LOW')).toBe('Low');
    expect(impactFromRelevance(undefined)).toBeNull();
    expect(impactFromRelevance('whatever')).toBeNull();
  });

  it('a trend without a recommendation or judgments yields unknowns, not defaults', () => {
    const sparse = { ...context, trends: [{ id: 't2', topic: 'Sparse' }] };
    expect(buildOpportunity('trend-t2', sparse)).toMatchObject({ title: 'Sparse', description: '', channel: null, effort: null, impact: null });
  });

  it('filters skip unknown values instead of matching them', () => {
    const ops = [{ id: 'a', channel: null, effort: null, impact: null }, { id: 'b', channel: 'Search', effort: 'Quick Win', impact: 'High' }];
    expect(filterOpportunities(ops, { channel: '', effort: '', impact: '' })).toHaveLength(2);
    expect(filterOpportunities(ops, { channel: 'Search', effort: '', impact: '' }).map((o) => o.id)).toEqual(['b']);
    expect(summarizeOpportunities(ops)).toEqual({ total: 2, highImpact: 1, quickWins: 1, strategic: 0 });
  });
});
