// Repository hygiene: no personal data, no leftover claims, no storage of the
// API key, no network fonts, no fixture in the shipped source.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { competitors, homeSystem } from '../../src/data/competitors';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const BINARY = /\.(woff2?|ttf|png|jpe?g|gif|mp4|webm|ico|pdf|docx)$/i;
// A ZIP download has no .git directory: the file checks then walk the folder, and the history check is skipped.
const hasGit = (() => {
  try { return existsSync('.git') && git('rev-parse', '--is-inside-work-tree').trim() === 'true'; } catch { return false; }
})();
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-fixture', 'coverage', 'playwright-report', 'test-results', '.demo-work']);
function walk(dir = '.') {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const path = dir === '.' ? name : join(dir, name).replace(/\\/g, '/');
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
// With git: tracked files plus new files that are about to be added (ignored files excluded).
const tracked = (hasGit ? git('ls-files', '--cached', '--others', '--exclude-standard').split('\n') : walk())
  .filter(Boolean).filter((f) => existsSync(f));
const textFiles = tracked.filter((f) => !BINARY.test(f) && f !== 'package-lock.json');
const read = (file) => readFileSync(file, 'utf8');
const SELF = 'tests/unit/hygiene.test.js';

// Patterns are assembled from parts so this file does not contain them.
const PERSONAL = [
  ['a local user name', new RegExp(['is', 'amb'].join(''), 'i')],
  ['a Windows home path', new RegExp(['C:', 'Users'].join('\\\\'), 'i')],
  ['a Windows home path (forward slashes)', new RegExp(['C:', 'Users'].join('/'), 'i')],
  ['a personal mail address', new RegExp(['gma', 'il\\.com'].join(''), 'i')],
  ['a college mail address', new RegExp(['gettys', 'burg'].join(''), 'i')],
];

describe('no personal data', () => {
  it.each(PERSONAL)('no tracked file contains %s', (_label, pattern) => {
    const hits = textFiles.filter((f) => pattern.test(read(f)) || pattern.test(f));
    expect(hits).toEqual([]);
  });

  it.skipIf(!hasGit).each(PERSONAL)('no commit message or author line contains %s (skipped without a .git directory)', (_label, pattern) => {
    const log = git('log', '--format=%an <%ae>%n%cn <%ce>%n%B');
    expect(log.split('\n').filter((line) => pattern.test(line))).toEqual([]);
  });

  it('the original .docx description is not tracked', () => {
    expect(tracked.filter((f) => /\.docx$/i.test(f))).toEqual([]);
  });
});

describe('no leftover claims', () => {
  const OLD_PHRASES = [
    ['Developed', 'for UPMC'].join(' '),
    ['for UPMC', 'Digital Marketing'].join(' '),
    ['Created by', 'Sam Jia', 'for UPMC'].join(' '),
    ['identified through', 'AI-powered research'].join(' '),
  ];

  it.each(OLD_PHRASES)('"%s" appears nowhere outside the tests that guard against it', (phrase) => {
    const hits = textFiles.filter((f) => !f.startsWith('tests/') && read(f).includes(phrase));
    expect(hits).toEqual([]);
  });

  it('the competitor list holds names and colour chips only', () => {
    for (const system of [...competitors, homeSystem]) {
      expect(Object.keys(system).sort()).toEqual(['color', 'id', 'initials', 'name', 'shortName']);
    }
    expect(existsSync('src/data/sampleData.js')).toBe(false);
    expect(existsSync('src/sampleData.js')).toBe(false);
  });

  it('there are no image files of any organization in the app', () => {
    const images = tracked.filter((f) => /\.(png|jpe?g|svg|webp|ico)$/i.test(f) && (f.startsWith('src/') || f.startsWith('public/')));
    expect(images).toEqual(['public/favicon.svg']);
  });
});

describe('the API key is never persisted or logged', () => {
  const sources = tracked.filter((f) => f.startsWith('src/') && /\.(js|jsx)$/.test(f));

  it('no source file touches browser storage or cookies', () => {
    const pattern = new RegExp(['local' + 'Storage', 'session' + 'Storage', 'indexed' + 'DB', 'document\\.' + 'cookie'].join('|'));
    expect(sources.filter((f) => pattern.test(read(f)))).toEqual([]);
  });

  it('no source file writes to the console', () => {
    const pattern = new RegExp('console' + '\\.');
    expect(sources.filter((f) => pattern.test(read(f)))).toEqual([]);
  });

  it('the only network call in the app is the one in the API client', () => {
    const fetchCall = /\bfetch(Impl)?\(/;
    expect(sources.filter((f) => fetchCall.test(read(f)))).toEqual(['src/lib/anthropicClient.js']);
    expect(sources.filter((f) => /XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(read(f)))).toEqual([]);
  });
});

describe('build inputs', () => {
  it('fonts are bundled, not fetched from a font service', () => {
    const pattern = new RegExp(['fonts\\.google' + 'apis', 'fonts\\.gst' + 'atic'].join('|'));
    const hits = textFiles.filter((f) => f !== SELF && pattern.test(read(f)));
    expect(hits).toEqual([]);
  });

  it('nothing under src/ imports the test fixtures', () => {
    const sources = tracked.filter((f) => f.startsWith('src/'));
    expect(sources.filter((f) => !BINARY.test(f) && /tests\/fixtures|\(fictional\)/.test(read(f)))).toEqual([]);
  });

  it('the unused SDK dependency is gone', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toContain('@anthropic-ai/sdk');
  });
});
