// The audit numbers quoted in the README are derived from the audit tables,
// and each table's TOTALS line is checked against its own rows.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { auditTotals, auditSentence, auditFactualSentence, VERDICTS } from '../../scripts/audit-totals.mjs';
import { competitors } from '../../src/data/competitors';

const dir = 'docs/audit';
const present = existsSync(dir);

describe.skipIf(!present)('audit of the original sample data', () => {
  const result = present ? auditTotals(dir) : null;

  it('has one table per competitor plus one for the trends', () => {
    expect(result.files.map((f) => f.file).sort()).toEqual([...competitors.map((c) => `${c.id}.md`), 'trends.md'].sort());
  });

  it('every TOTALS line equals the verdicts counted in its table', () => {
    for (const f of result.files) expect(f.rows, f.file).toEqual(f.totals);
  });

  it('the README quotes exactly the totals computed from the tables', () => {
    const readme = readFileSync('README.md', 'utf8');
    expect(readme).toContain(auditSentence(result));
    expect(readme).toContain(auditFactualSentence(result));
    expect(result.statements).toBe(VERDICTS.reduce((n, v) => n + result.totals[v], 0));
  });
});
