import { describe, it, expect } from 'vitest';
import { buildDataset, computeStats, snapshotDateRange, formatDateRange } from '../../src/lib/dataset';
import { dataset as fixture } from '../fixtures/dataset';
import { dataset as shipped } from '../../src/data/dataset';
import { fixtureCompetitors, fixtureHomeSystem } from '../fixtures/competitors';
import exampleHealth from '../fixtures/snapshot/competitors/example-health.json';

describe('buildDataset', () => {
  it('loads the fixture: two systems with data, one without, a home profile and two trends', () => {
    expect(Object.keys(fixture.entries).sort()).toEqual(['example-health', 'sample-regional']);
    expect(fixture.entries['placeholder-clinic']).toBeUndefined();
    expect(fixture.homeEntry.data.id).toBe('home-example');
    expect(fixture.trends).toHaveLength(2);
    expect(fixture.invalid).toEqual([]);
    expect(fixture.isFixture).toBe(true);
    expect(fixture.entries['example-health'].provenance).toEqual({ kind: 'snapshot', asOf: '2026-01-20' });
  });

  it('leaves out a file that fails validation and says why', () => {
    const broken = JSON.parse(JSON.stringify(exampleHealth));
    broken.facts[0].evidence = [];
    const ds = buildDataset({
      competitorList: fixtureCompetitors,
      homeSystem: fixtureHomeSystem,
      competitorFiles: { './snapshot/competitors/example-health.json': broken },
    });
    expect(ds.entries).toEqual({});
    expect(ds.invalid).toHaveLength(1);
    expect(ds.invalid[0].problems[0]).toContain('facts[0].evidence');
  });

  it('the shipped dataset is not a fixture and has no invalid files', () => {
    expect(shipped.isFixture).toBe(false);
    expect(shipped.invalid).toEqual([]);
  });
});

describe('computeStats', () => {
  it('counts what is loaded', () => {
    const stats = computeStats(fixture);
    expect(stats.systemsTracked).toBe(3);
    expect(stats.systemsWithData).toBe(2);
    expect(stats.facts).toBe(15); // 5 + 5 + 5 (home)
    expect(stats.trends).toBe(2);
    const urls = new Set();
    const walk = (node) => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === 'object') {
        if (Array.isArray(node.evidence)) node.evidence.forEach((ev) => urls.add(ev.url));
        Object.values(node).forEach(walk);
      }
    };
    walk([fixture.entries, fixture.homeEntry, fixture.trends]);
    expect(stats.sources).toBe(urls.size);
    expect(stats.sources).toBeGreaterThan(15);
  });

  it('is all zeros for an empty dataset', () => {
    const empty = buildDataset({ competitorList: fixtureCompetitors });
    expect(computeStats(empty)).toEqual({ systemsTracked: 3, systemsWithData: 0, facts: 0, sources: 0, trends: 0 });
    expect(snapshotDateRange(empty)).toBeNull();
    expect(formatDateRange(null)).toBeNull();
  });
});

describe('snapshotDateRange', () => {
  it('gives one date when all files share it and a range otherwise', () => {
    expect(formatDateRange(snapshotDateRange(fixture))).toBe('2026-01-20');
    expect(formatDateRange({ from: '2026-01-01', to: '2026-01-20' })).toBe('2026-01-01 to 2026-01-20');
  });
});
