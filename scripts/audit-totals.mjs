#!/usr/bin/env node
// Adds up the "TOTALS supported=.. corrected=.. not_found=.. wrong=.. opinion=.."
// line of every audit table in docs/audit/ and prints the result.
// tests/unit/audit.test.js uses the same function to check the README.

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERDICTS = ['supported', 'corrected', 'not_found', 'wrong', 'opinion'];
const TOTALS_LINE = /^TOTALS\s+supported=(\d+)\s+corrected=(\d+)\s+not_found=(\d+)\s+wrong=(\d+)\s+opinion=(\d+)\s*$/m;

/** Returns { files: [{ file, totals, rows }], totals, statements }. `rows` is the same count taken from the table itself. */
export function auditTotals(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((file) => {
    const text = readFileSync(join(dir, file), 'utf8');
    const match = text.match(TOTALS_LINE);
    if (!match) throw new Error(`${file}: no TOTALS line`);
    const totals = Object.fromEntries(VERDICTS.map((v, i) => [v, Number(match[i + 1])]));
    const rows = Object.fromEntries(VERDICTS.map((v) => [v, 0]));
    for (const line of text.split('\n')) {
      if (!line.startsWith('|')) continue;
      const cells = line.split('|').map((c) => c.trim());
      const verdict = (cells[2] || '').toLowerCase().replace(/\s+/g, '_');
      if (verdict in rows) rows[verdict] += 1;
    }
    return { file, totals, rows };
  });
  const totals = Object.fromEntries(VERDICTS.map((v) => [v, files.reduce((n, f) => n + f.totals[v], 0)]));
  const statements = VERDICTS.reduce((n, v) => n + totals[v], 0);
  return { files, totals, statements };
}

/** The sentence used in the README. */
export function auditSentence({ totals, statements, files }) {
  return `${statements} statements audited in ${files.length} tables: ${totals.supported} supported, ${totals.corrected} corrected, ${totals.not_found} not found, ${totals.wrong} wrong, ${totals.opinion} opinion.`;
}

/** Second README sentence: how many of the statements that were facts (not opinion) held up. */
export function auditFactualSentence({ totals, statements }) {
  return `${totals.supported} of the ${statements - totals.opinion} factual statements held up as written.`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = resolve(fileURLToPath(new URL('../docs/audit', import.meta.url)));
  const result = auditTotals(dir);
  for (const f of result.files) console.log(`${f.file.padEnd(28)} ${VERDICTS.map((v) => `${v}=${f.totals[v]}`).join(' ')}`);
  console.log(auditSentence(result));
  console.log(auditFactualSentence(result));
}
