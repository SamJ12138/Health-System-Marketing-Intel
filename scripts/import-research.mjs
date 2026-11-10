#!/usr/bin/env node
// Copy a research snapshot into the repository, but only the files that pass
// the validator. Nothing is edited: a file with violations is listed and left out.
//
//   node scripts/import-research.mjs <research-dir>
//
// <research-dir>/competitors/<id>.json  -> src/data/snapshot/competitors/
// <research-dir>/trends.json            -> src/data/snapshot/trends.json
// <research-dir>/audit/*.md             -> docs/audit/
//
// Run with --check to validate without copying (also works on src/data/snapshot).

import { readdirSync, readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCompetitorFile, validateTrendsFile, formatProblems } from '../src/lib/validateSnapshot.js';
import { competitors, homeSystem } from '../src/data/competitors.js';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const source = args.find((a) => !a.startsWith('--'));
if (!source) {
  console.error('usage: node scripts/import-research.mjs <research-dir> [--check]');
  process.exit(2);
}
const from = resolve(source);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const snapshotDir = join(root, 'src', 'data', 'snapshot');
const knownIds = competitors.map((c) => c.id);
let failed = 0;

function report(label, result, extra = '') {
  const status = result.ok ? 'OK  ' : 'FAIL';
  console.log(`${status} ${label}${extra}`);
  for (const line of formatProblems(result.errors)) console.log(`       error: ${line}`);
  for (const line of formatProblems(result.warnings)) console.log(`       note:  ${line}`);
  if (!result.ok) failed += 1;
}

function readJson(path) {
  try {
    return { data: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (error) {
    return { error: { ok: false, errors: [{ path: '', message: `not valid JSON: ${error.message}` }], warnings: [] } };
  }
}

const competitorDir = join(from, 'competitors');
const files = existsSync(competitorDir) ? readdirSync(competitorDir).filter((f) => f.endsWith('.json')).sort() : [];
const expected = [...knownIds, homeSystem.id];
if (!checkOnly) mkdirSync(join(snapshotDir, 'competitors'), { recursive: true });

for (const file of files) {
  const id = file.replace(/\.json$/, '');
  const path = join(competitorDir, file);
  const { data, error } = readJson(path);
  const isHome = id === homeSystem.id;
  const result = error || validateCompetitorFile(data, { expectedId: id, knownIds: isHome ? [homeSystem.id] : knownIds, home: isHome });
  const counts = data && result.ok ? `  (${data.facts.length} facts, ${data.channels.length} channels, asOf ${data.asOf})` : '';
  report(`competitors/${file}`, result, counts);
  if (result.ok && !checkOnly) copyFileSync(path, join(snapshotDir, 'competitors', file));
}
for (const id of expected) {
  if (!files.includes(`${id}.json`)) console.log(`MISS competitors/${id}.json  (not in ${from})`);
}

const trendsPath = join(from, 'trends.json');
if (existsSync(trendsPath)) {
  const { data, error } = readJson(trendsPath);
  const result = error || validateTrendsFile(data);
  report('trends.json', result, data && result.ok ? `  (${data.length} trends)` : '');
  if (result.ok && !checkOnly) copyFileSync(trendsPath, join(snapshotDir, 'trends.json'));
} else {
  console.log(`MISS trends.json  (not in ${from})`);
}

const auditDir = join(from, 'audit');
if (!checkOnly && existsSync(auditDir)) {
  const target = join(root, 'docs', 'audit');
  mkdirSync(target, { recursive: true });
  const audits = readdirSync(auditDir).filter((f) => f.endsWith('.md')).sort();
  for (const file of audits) copyFileSync(join(auditDir, file), join(target, file));
  console.log(`copied ${audits.length} audit file(s) to docs/audit/`);
}

if (failed > 0) {
  console.error(`\n${failed} file(s) failed validation and were ${checkOnly ? 'reported' : 'not copied'}.`);
  process.exit(1);
}
