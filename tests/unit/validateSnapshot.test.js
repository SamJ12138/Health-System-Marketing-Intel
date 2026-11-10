import { describe, it, expect } from 'vitest';
import {
  validateCompetitorFile, validateTrendsFile, validateTrend, isIsoDate, isPublishedValue, formatProblems,
} from '../../src/lib/validateSnapshot';
import exampleHealth from '../fixtures/snapshot/competitors/example-health.json';
import homeExample from '../fixtures/snapshot/competitors/home-example.json';
import fixtureTrends from '../fixtures/snapshot/trends.json';

const clone = (v) => JSON.parse(JSON.stringify(v));
const options = { expectedId: 'example-health', knownIds: ['example-health'] };
/** Validate a mutated copy of the fixture and return the reported paths. */
function pathsAfter(mutate, opts = options, base = exampleHealth) {
  const data = clone(base);
  mutate(data);
  return validateCompetitorFile(data, opts).errors.map((e) => e.path);
}

describe('dates', () => {
  it('accepts only real ISO calendar dates', () => {
    expect(isIsoDate('2026-11-10')).toBe(true);
    for (const bad of ['2026-13-01', '2026-02-30', '2026-1-1', '10/11/2026', '2026-11-10T00:00:00Z', 20261110, null]) {
      expect(isIsoDate(bad)).toBe(false);
    }
  });

  it('accepts a date, year-month, year or null for "published"', () => {
    for (const ok of ['2026-11-10', '2026-11', '2026', null, undefined]) expect(isPublishedValue(ok)).toBe(true);
    for (const bad of ['November 2026', '2026-13', '26', 2026, '']) expect(isPublishedValue(bad)).toBe(false);
  });
});

describe('validateCompetitorFile', () => {
  it('accepts the fixture', () => {
    const result = validateCompetitorFile(exampleHealth, options);
    expect(formatProblems(result.errors)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('rejects something that is not an object', () => {
    expect(validateCompetitorFile([], options).ok).toBe(false);
    expect(validateCompetitorFile(null, options).ok).toBe(false);
  });

  it('requires id, name, asOf', () => {
    expect(pathsAfter((d) => { delete d.id; })).toContain('id');
    expect(pathsAfter((d) => { d.name = ' '; })).toContain('name');
    expect(pathsAfter((d) => { d.asOf = 'November 2026'; })).toContain('asOf');
  });

  it('requires the id to match the file name and the competitor list', () => {
    expect(pathsAfter(() => {}, { expectedId: 'other', knownIds: ['example-health'] })).toEqual(['id']);
    expect(pathsAfter(() => {}, { expectedId: 'example-health', knownIds: ['someone-else'] })).toEqual(['id']);
  });

  it('requires at least one evidence entry on every fact', () => {
    expect(pathsAfter((d) => { d.facts[0].evidence = []; })).toEqual(['facts[0].evidence']);
    expect(pathsAfter((d) => { delete d.facts[1].evidence; })).toEqual(['facts[1].evidence']);
  });

  it.each([
    ['http://example.com/not-https'],
    ['javascript:alert(1)'],
    ['data:text/html,x'],
    ['example.com/no-scheme'],
    [''],
    [undefined],
  ])('rejects evidence url %j', (url) => {
    expect(pathsAfter((d) => { d.facts[0].evidence[0].url = url; })).toEqual(['facts[0].evidence[0].url']);
  });

  it('checks every field of an evidence entry', () => {
    expect(pathsAfter((d) => { d.facts[0].evidence[0].title = ''; })).toEqual(['facts[0].evidence[0].title']);
    expect(pathsAfter((d) => { delete d.facts[0].evidence[0].publisher; })).toEqual(['facts[0].evidence[0].publisher']);
    expect(pathsAfter((d) => { d.facts[0].evidence[0].published = 'last week'; })).toEqual(['facts[0].evidence[0].published']);
    expect(pathsAfter((d) => { d.facts[0].evidence[0].accessed = '2026'; })).toEqual(['facts[0].evidence[0].accessed']);
    expect(pathsAfter((d) => { d.facts[0].evidence[0].quote = 'x'.repeat(241); })).toEqual(['facts[0].evidence[0].quote']);
    expect(pathsAfter((d) => { d.facts[0].evidence[0].quote = 'x'.repeat(240); })).toEqual([]);
  });

  it('requires evidence on the positioning and on every channel', () => {
    expect(pathsAfter((d) => { d.positioning.evidence = []; })).toEqual(['positioning.evidence']);
    expect(pathsAfter((d) => { delete d.positioning; })).toEqual(['positioning']);
    expect(pathsAfter((d) => { d.channels[0].evidence = []; })).toEqual(['channels[0].evidence']);
    expect(pathsAfter((d) => { d.channels[0].url = 'http://example.com'; })).toEqual(['channels[0].url']);
  });

  it('rejects duplicate fact ids and unknown categories', () => {
    expect(pathsAfter((d) => { d.facts[1].id = 'f1'; })).toContain('facts[1].id');
    expect(pathsAfter((d) => { d.facts[0].category = 'rumour'; })).toEqual(['facts[0].category']);
  });

  it('requires every analysis item to point at fact ids that exist', () => {
    expect(pathsAfter((d) => { d.analysis.strengths[0].basedOn = ['f1', 'f99']; })).toEqual(['analysis.strengths[0].basedOn[1]']);
    expect(pathsAfter((d) => { d.analysis.gaps[0].basedOn = []; })).toEqual(['analysis.gaps[0].basedOn']);
    expect(pathsAfter((d) => { delete d.analysis.opportunitiesForUpmc[0].basedOn; })).toEqual(['analysis.opportunitiesForUpmc[0].basedOn']);
    expect(pathsAfter((d) => { d.analysis.strengths[0].text = ''; })).toEqual(['analysis.strengths[0].text']);
  });

  it('requires all three analysis lists for a competitor, and allows an empty gaps list', () => {
    expect(pathsAfter((d) => { delete d.analysis.opportunitiesForUpmc; })).toEqual(['analysis.opportunitiesForUpmc']);
    expect(pathsAfter((d) => { d.analysis.gaps = []; })).toEqual([]);
  });

  it('accepts a home-system profile without opportunitiesForUpmc', () => {
    const opts = { expectedId: 'home-example', knownIds: ['home-example'], home: true };
    expect(validateCompetitorFile(homeExample, opts).ok).toBe(true);
    // The same file is not a valid competitor file.
    expect(validateCompetitorFile(homeExample, { ...opts, home: false }).errors.map((e) => e.path)).toEqual(['analysis.opportunitiesForUpmc']);
  });

  it('reports item counts outside the ranges the schema asks for as warnings, not errors', () => {
    const data = clone(exampleHealth);
    data.facts = data.facts.slice(0, 3);
    data.analysis.strengths[1].basedOn = ['f3'];
    data.analysis.opportunitiesForUpmc[1].basedOn = ['f3'];
    const result = validateCompetitorFile(data, options);
    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => w.path)).toContain('facts');
  });
});

describe('validateTrendsFile', () => {
  const trendPaths = (mutate) => {
    const data = clone(fixtureTrends);
    mutate(data);
    return validateTrendsFile(data).errors.map((e) => e.path);
  };

  it('accepts the fixture', () => {
    expect(formatProblems(validateTrendsFile(fixtureTrends).errors)).toEqual([]);
  });

  it('must be an array', () => {
    expect(validateTrendsFile({}).ok).toBe(false);
  });

  it('requires sourced summary and examples', () => {
    expect(trendPaths((d) => { d[0].summary.evidence = []; })).toEqual(['[0].summary.evidence']);
    expect(trendPaths((d) => { d[0].examples[1].evidence[0].url = 'javascript:alert(1)'; })).toEqual(['[0].examples[1].evidence[0].url']);
    expect(trendPaths((d) => { delete d[1].examples; })).toEqual(['[1].examples']);
  });

  it('checks ids, dates and the fixed vocabularies', () => {
    expect(trendPaths((d) => { d[1].id = d[0].id; })).toEqual(['[1].id']);
    expect(trendPaths((d) => { d[0].asOf = '2026/01/20'; })).toEqual(['[0].asOf']);
    expect(trendPaths((d) => { d[0].channel = 'Content Marketing'; })).toEqual(['[0].channel']);
    expect(trendPaths((d) => { d[0].analysis.relevance = 'high'; })).toEqual(['[0].analysis.relevance']);
    expect(trendPaths((d) => { d[0].analysis.effort = 'Easy'; })).toEqual(['[0].analysis.effort']);
    expect(trendPaths((d) => { d[0].analysis.recommendation = ''; })).toEqual(['[0].analysis.recommendation']);
    expect(trendPaths((d) => { d[0].analysis.challenges = 'none'; })).toEqual(['[0].analysis.challenges']);
  });

  it('validates a single trend with plain paths', () => {
    const trend = clone(fixtureTrends[0]);
    delete trend.topic;
    expect(validateTrend(trend).errors.map((e) => e.path)).toEqual(['topic']);
  });
});
