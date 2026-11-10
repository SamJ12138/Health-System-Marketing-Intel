// Guards the repository: every snapshot file that is committed must pass the
// validator, so a fact without a source link cannot be merged.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateCompetitorFile, validateTrendsFile, formatProblems } from '../../src/lib/validateSnapshot';
import { competitors, homeSystem } from '../../src/data/competitors';
import { fixtureCompetitors, fixtureHomeSystem } from '../fixtures/competitors';

const root = process.cwd();
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const jsonFilesIn = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []);

function checkDirectory(label, dir, list, home) {
  const competitorDir = join(dir, 'competitors');
  const knownIds = list.map((c) => c.id);
  const files = jsonFilesIn(competitorDir);

  describe(label, () => {
    it('contains only files for known systems', () => {
      const allowed = [...knownIds, home.id].map((id) => `${id}.json`);
      expect(files.filter((f) => !allowed.includes(f))).toEqual([]);
    });

    it.each(files.length ? files : ['(no competitor files yet)'])('%s is valid', (file) => {
      if (!files.length) return;
      const id = file.replace(/\.json$/, '');
      const isHome = id === home.id;
      const result = validateCompetitorFile(readJson(join(competitorDir, file)), {
        expectedId: id, knownIds: isHome ? [home.id] : knownIds, home: isHome,
      });
      expect(formatProblems(result.errors)).toEqual([]);
    });

    it('trends.json is valid if present', () => {
      const path = join(dir, 'trends.json');
      if (!existsSync(path)) return;
      expect(formatProblems(validateTrendsFile(readJson(path)).errors)).toEqual([]);
    });
  });
}

checkDirectory('shipped snapshot (src/data/snapshot)', join(root, 'src', 'data', 'snapshot'), competitors, homeSystem);
checkDirectory('fictional fixture (tests/fixtures/snapshot)', join(root, 'tests', 'fixtures', 'snapshot'), fixtureCompetitors, fixtureHomeSystem);

describe('fixture labelling', () => {
  it('every fixture system is named as fictional and links only to example.com', () => {
    const dir = join(root, 'tests', 'fixtures', 'snapshot');
    for (const file of jsonFilesIn(join(dir, 'competitors'))) {
      const text = readFileSync(join(dir, 'competitors', file), 'utf8');
      expect(readJson(join(dir, 'competitors', file)).name).toMatch(/\(fictional\)$/);
      const urls = text.match(/https?:\/\/[^"\s]+/g) || [];
      expect(urls.filter((u) => !u.startsWith('https://example.com/'))).toEqual([]);
    }
    const trendUrls = readFileSync(join(dir, 'trends.json'), 'utf8').match(/https?:\/\/[^"\s]+/g) || [];
    expect(trendUrls.filter((u) => !u.startsWith('https://example.com/'))).toEqual([]);
  });
});
