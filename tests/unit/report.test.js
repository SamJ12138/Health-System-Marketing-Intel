import { describe, it, expect } from 'vitest';
import { buildReport, REPORT_TITLE, REPORT_DISCLAIMER, reportFileName } from '../../src/lib/report';
import { toggleOpportunity } from '../../src/lib/opportunities';
import { dataset } from '../fixtures/dataset';

const generatedAt = new Date(2026, 0, 22, 9, 30);
const base = {
  competitors: dataset.competitors,
  homeSystem: dataset.homeSystem,
  homeEntry: dataset.homeEntry,
  entries: dataset.entries,
  trends: dataset.trends,
  opportunities: [],
  generatedAt,
};
const liveEntry = {
  data: { ...dataset.entries['example-health'].data, positioning: undefined, channels: [], analysis: { strengths: [], gaps: [], opportunitiesForUpmc: [] } },
  provenance: { kind: 'live', fetchedAt: '2026-01-22T09:00:00', model: 'model-under-test', dropped: { statements: 2, analysis: 1 } },
};

describe('buildReport', () => {
  it('starts with the title and the independence line', () => {
    const lines = buildReport(base).split('\n').filter((l) => l.trim());
    expect(lines[0]).toBe('# Competitive Intelligence Report — health-system digital marketing (UPMC perspective)');
    expect(lines[1]).toBe('Independent analysis by Sam Jia. Not affiliated with or endorsed by UPMC. Sources are linked next to each fact.');
    expect(lines[0]).toBe(`# ${REPORT_TITLE}`);
    expect(lines[1]).toBe(REPORT_DISCLAIMER);
  });

  it('says what the content is instead of claiming AI-powered research', () => {
    const md = buildReport(base);
    expect(md).toContain('Content: verified snapshot of 2026-01-20.');
    expect(md).not.toMatch(/AI-powered/i);
    expect(md).not.toMatch(/for UPMC Digital Marketing/i);
    expect(md).not.toMatch(/Prepared by/i);
    expect(md).not.toContain('live research');
    expect(md).toContain('Generated: 2026-01-22');
  });

  it('names live research as unreviewed when some of the content comes from it', () => {
    const md = buildReport({ ...base, entries: { ...dataset.entries, 'example-health': liveEntry } });
    expect(md).toContain('Content: verified snapshot of 2026-01-20, and live research results marked "unreviewed"');
    expect(md).toContain('Live research · unreviewed · 2026-01-22 09:00 · model-under-test');
    expect(md).toContain('written by a language model with web search and not checked by a person');
  });

  it('says so when there is only live research', () => {
    const md = buildReport({ ...base, homeEntry: null, trends: [], entries: { 'example-health': liveEntry } });
    expect(md).toContain('Content: live research results marked "unreviewed"');
    expect(md).not.toContain('verified snapshot of');
  });

  it('says so when nothing is loaded', () => {
    const md = buildReport({ ...base, homeEntry: null, trends: [], entries: {} });
    expect(md).toContain('Content: no verified snapshot is loaded');
    expect(md).not.toContain('## Competitors');
    expect(md).not.toContain('## Trends');
  });

  it('lists every fact with its source links', () => {
    const md = buildReport(base);
    for (const entry of Object.values(dataset.entries)) {
      for (const fact of entry.data.facts) {
        const line = md.split('\n').find((l) => l.includes(fact.text));
        expect(line, fact.text).toBeDefined();
        for (const ev of fact.evidence) expect(line).toContain(`](${ev.url})`);
        expect(line).toContain(`(${fact.id})`);
      }
    }
    expect(md).toContain('[Sample Notes blog (fictional page)](https://example.com/fixture/example-health/blog), Example Publisher (fictional), 2026-01-15');
    expect(md).toContain('date not shown on page');
  });

  it('puts strengths, gaps and opportunities under an Analysis heading with the facts they rest on', () => {
    const md = buildReport(base);
    const section = md.slice(md.indexOf('### Example Health (fictional)'), md.indexOf('### Sample Regional Medical (fictional)'));
    const analysisAt = section.indexOf('#### Analysis');
    expect(analysisAt).toBeGreaterThan(section.indexOf('**Facts**'));
    const analysis = section.slice(analysisAt);
    expect(analysis).toContain("author's judgment");
    expect(analysis).toContain('- Fixture analysis: a regular blog and a video channel give it two owned content outlets. [based on f1, f2]');
    expect(analysis).toContain('Opportunities for UPMC');
    // no analysis sentence appears before the Analysis heading
    expect(section.slice(0, analysisAt)).not.toContain('Fixture analysis');
    // and analysis lines carry no links
    expect(analysis).not.toContain('](https://');
  });

  it('includes the baseline system and the trends, with trend judgments under Analysis', () => {
    const md = buildReport(base);
    expect(md).toContain('## Baseline system: Home Example System (fictional)');
    expect(md).not.toMatch(/Home Example System[\s\S]*Opportunities for UPMC[\s\S]*## Competitors/);
    const trend = md.slice(md.indexOf('### Short video explainers (fixture trend)'));
    expect(trend.indexOf('#### Analysis')).toBeGreaterThan(trend.indexOf('**Examples**'));
    expect(trend).toContain('Relevance: HIGH');
    expect(trend).toContain('Recommendation for UPMC: Fixture recommendation: test a four-week series');
  });

  it('prints nothing for unknown or missing fields', () => {
    const sparseTrend = { id: 'live-1', topic: 'Sparse', summary: dataset.trends[0].summary, examples: [], provenance: liveEntry.provenance };
    const opportunities = toggleOpportunity([], 'comp-example-health', { competitors: dataset.competitors, entries: dataset.entries, trends: dataset.trends });
    const md = buildReport({ ...base, entries: { 'example-health': liveEntry, 'sample-regional': dataset.entries['sample-regional'] }, trends: [sparseTrend], opportunities });
    for (const junk of ['undefined', 'null', 'N/A', 'NaN', '[object Object]', '| — |', 'Channel: ;', 'Effort: ;']) {
      expect(md, junk).not.toContain(junk);
    }
    const live = md.slice(md.indexOf('### Example Health (fictional)'), md.indexOf('### Sample Regional Medical (fictional)'));
    for (const absent of ['**Positioning**', '**Channels**', '#### Analysis', 'Strengths', 'Observable gaps']) expect(live).not.toContain(absent);
    const sparse = md.slice(md.indexOf('### Sparse'));
    for (const absent of ['**Examples**', 'Relevance', 'Effort', 'Recommendation', 'Challenges']) {
      expect(sparse.slice(0, sparse.indexOf('## Saved opportunities'))).not.toContain(absent);
    }
    // gaps is empty for Sample Regional: no empty heading
    expect(md.slice(md.indexOf('### Sample Regional Medical (fictional)'))).not.toContain('Observable gaps');
  });

  it('lists saved opportunities with only the fields that are known', () => {
    const ctx = { competitors: dataset.competitors, entries: dataset.entries, trends: dataset.trends };
    let opportunities = toggleOpportunity([], 'comp-example-health', ctx);
    opportunities = toggleOpportunity(opportunities, 'trend-fixture-video', ctx);
    const md = buildReport({ ...base, opportunities });
    const section = md.slice(md.indexOf('## Saved opportunities'));
    expect(section).toContain('- **Example Health (fictional): opportunity for UPMC**: Fixture analysis: answer the weekly blog with a comparable regular series. [based on f1]');
    expect(section).toContain('- **Short video explainers (fixture trend)**: Fixture recommendation: test a four-week series of one-minute explainers. (Channel: Social; Effort: Quick Win; Impact: High)');
    expect(section).not.toContain('Channel: Content');
    expect(md).toContain('Saved opportunities: 2 (1 high impact, 1 quick win)');
  });

  it('never writes a non-http address as a link and escapes link text', () => {
    const data = JSON.parse(JSON.stringify(dataset.entries['example-health'].data));
    data.facts[0].evidence[0].url = 'javascript:alert(1)';
    data.facts[1].evidence[0].title = 'Title with [brackets] and a ) paren';
    data.facts[1].evidence[0].url = 'https://example.com/fixture/a path/(x)';
    const md = buildReport({ ...base, entries: { 'example-health': { data, provenance: dataset.entries['example-health'].provenance } } });
    expect(md).not.toContain('javascript:');
    expect(md).toContain('Sample Notes blog (fictional page), Example Publisher (fictional), 2026-01-15 (no link: not an http/https address)');
    expect(md).toContain('[Title with \\[brackets\\] and a ) paren](https://example.com/fixture/a%20path/%28x%29)');
  });

  it('names the download after the date', () => {
    expect(reportFileName(generatedAt)).toBe('competitive-intelligence-report-2026-01-22.md');
  });
});
