// Numbers and fixed lines in the README are derived from the repository, not typed.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dataset } from '../../src/data/dataset';
import { computeStats, snapshotDateRange, formatDateRange } from '../../src/lib/dataset';
import { DISCLAIMER, APP_TITLE } from '../../src/lib/disclaimer';
import { WEB_SEARCH_TOOL, DEFAULT_MODEL } from '../../src/lib/anthropicClient';

const readme = readFileSync('README.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

describe('README', () => {
  it('opens with the title and the demo, and carries the independence statement', () => {
    expect(readme.startsWith(`# ${APP_TITLE}\n`)).toBe(true);
    expect(readme).toContain('](docs/demo.gif)');
    expect(readme).toContain('(docs/demo.mp4)');
    expect(readme).toContain(DISCLAIMER);
  });

  it('describes the snapshot with numbers computed from the snapshot files', () => {
    const stats = computeStats(dataset);
    const date = formatDateRange(snapshotDateRange(dataset));
    const channels = [...Object.values(dataset.entries), dataset.homeEntry].filter(Boolean)
      .reduce((n, entry) => n + entry.data.channels.length, 0);
    const home = dataset.homeEntry ? ` and ${dataset.homeSystem.name}` : '';
    const sentence = `The snapshot is dated ${date}. It covers ${stats.systemsWithData} competitor systems${home}: ${stats.facts} facts, ${channels} channel entries and ${stats.trends} trends, backed by ${stats.sources} distinct source addresses.`;
    expect(readme).toContain(sentence);
    expect(readme).toContain(`verified snapshot of ${date}`);
  });

  it('says the live path is tested against fixtures only and names the values it uses', () => {
    expect(readme).toContain('The live path has been tested against fixtures only.');
    expect(readme).toContain(`\`${WEB_SEARCH_TOOL.type}\``);
    expect(readme).toContain(`\`${DEFAULT_MODEL}\``);
    expect(readme).toContain('https://api.anthropic.com/v1/messages');
  });

  it('only names npm scripts that exist', () => {
    const named = [...readme.matchAll(/`npm run ([a-z0-9:]+)/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(5);
    expect(named.filter((name) => !(name in pkg.scripts))).toEqual([]);
  });

  it('points at files that exist', () => {
    for (const path of ['docs/data-schema.md', 'docs/audit', 'LICENSE', 'scripts/make-demo-video.mjs', '.github/workflows/ci.yml']) {
      expect(existsSync(path), path).toBe(true);
    }
  });
});

describe('package.json', () => {
  it('has the agreed name, version and licence', () => {
    expect(pkg.name).toBe('health-system-marketing-intel');
    expect(pkg.version).toBe('0.2.0');
    expect(pkg.license).toBe('MIT');
    expect(readFileSync('LICENSE', 'utf8')).toContain('Copyright (c) 2026 Tianyi Jia');
  });
});
