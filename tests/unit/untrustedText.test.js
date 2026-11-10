// Live research text is written by a model. None of it may change the
// structure of the exported report or smuggle a link into it.
import { describe, it, expect } from 'vitest';
import { researchCompetitor, researchTrend, describeError } from '../../src/lib/liveResearch';
import { extractAnswer } from '../../src/lib/parseResponse';
import { buildReport, escapeMarkdown } from '../../src/lib/report';

const SRC = 'https://example.com/fixture/example-health/about';
const search = [
  { type: 'text', text: 'I will search.' },
  { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: { query: 'example health marketing' } },
  { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1', content: [{ type: 'web_search_result', url: SRC, title: 'About', encrypted_content: 'x', page_age: null }] },
];
const reply = (content, stop_reason = 'end_turn', model = 'model-under-test') => async () => ({
  ok: true, status: 200, headers: { get: () => null }, json: async () => ({ content, stop_reason, model }),
});
const competitor = { id: 'example-health', name: 'Example Health (fictional)' };
const ev = [{ url: SRC, title: 'About', publisher: 'Example Publisher (fictional)', published: null }];
const answer = (factText, extra = {}) => ({
  positioning: { text: 'p', evidence: ev },
  facts: [{ id: 'f1', category: 'content', text: factText, evidence: ev }],
  channels: [],
  analysis: { strengths: [{ text: 's', basedOn: ['f1'] }], gaps: [], opportunitiesForUpmc: [{ text: 'o', basedOn: ['f1'] }] },
  ...extra,
});
const fence = (o) => `\`\`\`json\n${JSON.stringify(o, null, 1)}\n\`\`\``;
const generatedAt = new Date(2026, 0, 22, 9, 30);
const base = { apiKey: 'sk-ant-fixture-key-000', now: generatedAt };

const FORGED_FACT = 'Real fact.\n\n### Another System (fictional)\n\n_Verified snapshot · 2026-01-20_\n\n**Facts**\n\n- (f1) Another System (fictional) was fined. Sources: [Newsroom](javascript:alert(document.domain)), Another System, 2026-01-01.';
const FORGED_TOPIC = 'Topic\n\n## Baseline system: Example\n\n_Verified snapshot · 2026-01-20_';

describe('model-written text cannot forge the report', () => {
  it('a fact carrying newlines, a heading, a "Verified snapshot" line and a javascript: link stays one inert line', async () => {
    const entry = await researchCompetitor({ ...base, competitor, fetchImpl: reply([...search, { type: 'text', text: fence(answer(FORGED_FACT)) }]) });
    // the sanitizer leaves no line breaks in any string it keeps
    expect(JSON.stringify(entry.data)).not.toMatch(/\\n|\\r|\\t/);
    expect(entry.data.facts[0].text.startsWith('Real fact. ### Another System (fictional) _Verified snapshot')).toBe(true);

    const md = buildReport({ competitors: [competitor], entries: { [competitor.id]: entry }, trends: [], opportunities: [], generatedAt });
    const lines = md.split('\n');
    // exactly one system heading, and it is the real one
    expect(lines.filter((l) => /^#{1,6} /.test(l) && l.includes('Another System'))).toEqual([]);
    expect(lines.filter((l) => l.startsWith('### '))).toEqual(['### Example Health (fictional)']);
    // exactly one provenance line, and it says unreviewed
    const provenance = lines.filter((l) => /^_.*_$/.test(l));
    expect(provenance).toHaveLength(1);
    expect(provenance[0]).toContain('Live research · unreviewed');
    expect(lines.filter((l) => l.trim() === '**Facts**')).toHaveLength(1);
    // the forged text sits inside one list item, with its Markdown defused
    const item = lines.find((l) => l.startsWith('- (f1) '));
    expect(item).toContain('\\_Verified snapshot · 2026-01-20\\_');
    expect(item).toContain('\\*\\*Facts\\*\\*');
    expect(item).toContain('\\[Newsroom\\](javascript:alert(document.domain))');
    // every Markdown link in the report points at http(s)
    const targets = [...md.matchAll(/(?<!\\)\]\(([^)]*)\)/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.filter((t) => !/^https?:\/\//.test(t))).toEqual([]);
  });

  it('a trend topic carrying a forged section stays inside its own heading', async () => {
    const t = {
      topic: FORGED_TOPIC,
      summary: { text: 'A summary.\n# Not a heading', evidence: ev },
      examples: [{ text: 'e1\n\n- injected item', evidence: ev }, { text: 'e2', evidence: ev }],
      channel: 'Email',
      analysis: { relevance: 'HIGH', effort: 'Medium', recommendation: 'r\n\n## Trends', challenges: ['c\n- d'] },
    };
    const trend = await researchTrend({ ...base, query: 'q', fetchImpl: reply([...search, { type: 'text', text: fence(t) }]) });
    expect(JSON.stringify(trend)).not.toMatch(/\\n|\\r|\\t/);
    const md = buildReport({ competitors: [], entries: {}, trends: [trend], opportunities: [], generatedAt });
    const headings = md.split('\n').filter((l) => /^#{1,6} /.test(l));
    expect(headings).toEqual([
      expect.stringMatching(/^# Competitive Intelligence Report/),
      '## Summary',
      '## Trends',
      '### Topic ## Baseline system: Example \\_Verified snapshot · 2026-01-20\\_',
      '#### Analysis',
    ]);
    expect(md.split('\n').filter((l) => /^_.*_$/.test(l))).toEqual([expect.stringContaining('Live research · unreviewed')]);
    expect(md).not.toMatch(/^- injected item/m);
  });

  it('a model name from the response cannot carry Markdown or line breaks into the badge', async () => {
    const entry = await researchCompetitor({ ...base, competitor, model: 'claude-opus-5-5', fetchImpl: reply([...search, { type: 'text', text: fence(answer('A fact.')) }], 'end_turn', 'm_\n\n## Forged_') });
    expect(entry.provenance.model).toBe('claude-opus-5-5');
  });
});

describe('escapeMarkdown', () => {
  it('defuses inline Markdown and collapses whitespace', () => {
    expect(escapeMarkdown('a *b* _c_ `d` [e](f) <g> ~h~ | i')).toBe('a \\*b\\* \\_c\\_ \\`d\\` \\[e\\](f) \\<g> \\~h\\~ \\| i');
    expect(escapeMarkdown('line one\n\n  line two\ttab')).toBe('line one line two tab');
    expect(escapeMarkdown('back\\slash')).toBe('back\\\\slash');
    expect(escapeMarkdown('&#x6A;avascript &amp; R&D')).toBe('\\&#x6A;avascript \\&amp; R&D');
  });

  it('defuses block markers at the start of a text only', () => {
    expect(escapeMarkdown('# heading')).toBe('\\# heading');
    expect(escapeMarkdown('> quote')).toBe('\\> quote');
    expect(escapeMarkdown('- item')).toBe('\\- item');
    expect(escapeMarkdown('+ item')).toBe('\\+ item');
    expect(escapeMarkdown('1. item')).toBe('1\\. item');
    expect(escapeMarkdown('=== rule')).toBe('\\=== rule');
    expect(escapeMarkdown('the #MaskUp campaign - 2020')).toBe('the #MaskUp campaign - 2020');
  });

  it('leaves ordinary sentences alone', () => {
    const plain = "Becker's reported 739,000 subscribers (June 2026); 32% said \"yes\".";
    expect(escapeMarkdown(plain)).toBe(plain);
    expect(escapeMarkdown(undefined)).toBe('');
  });
});

describe('truncated answers', () => {
  const full = fence(answer('A fact.'));
  const truncated = full.slice(0, full.indexOf('"channels"'));

  it('an answer cut off at max_tokens is reported as truncated, not as empty', async () => {
    let error;
    try {
      await researchCompetitor({ ...base, competitor, fetchImpl: reply([...search, { type: 'text', text: truncated }], 'max_tokens') });
    } catch (e) { error = e; }
    expect(describeError(error).kind).toBe('truncated');
    expect(describeError(error).message).toMatch(/cut off/);
  });

  it('a nested object is never taken for the answer when the expected top-level keys are required', () => {
    const blocks = [{ type: 'text', text: truncated }];
    expect(extractAnswer(blocks, { requiredKeys: ['facts'] })).toBeUndefined();
    expect(extractAnswer([{ type: 'text', text: full }], { requiredKeys: ['facts'] })).toMatchObject({ facts: [{ id: 'f1' }] });
  });

  it('a complete answer that happens to end at the token limit is still used', async () => {
    const entry = await researchCompetitor({ ...base, competitor, fetchImpl: reply([...search, { type: 'text', text: full }], 'max_tokens') });
    expect(entry.data.facts).toHaveLength(1);
  });

  it('a truncated trend answer is reported as truncated', async () => {
    const t = fence({ topic: 'T', summary: { text: 's', evidence: ev }, examples: [], channel: 'Email', analysis: {} });
    let error;
    try {
      await researchTrend({ ...base, query: 'q', fetchImpl: reply([...search, { type: 'text', text: t.slice(0, t.indexOf('"examples"')) }], 'max_tokens') });
    } catch (e) { error = e; }
    expect(describeError(error).kind).toBe('truncated');
  });
});
