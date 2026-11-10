import { describe, it, expect } from 'vitest';
import {
  researchCompetitor, researchTrend, sanitizeCompetitorAnswer, sanitizeTrendAnswer, describeError, droppedSummary,
} from '../../src/lib/liveResearch';
import { LiveResearchError } from '../../src/lib/anthropicClient';
import { validateCompetitorFile, validateTrend } from '../../src/lib/validateSnapshot';
import {
  fakeFetch, multiBlockResponse, bareJsonResponse, malformedJsonResponse, emptyAnswerResponse, refusalResponse,
  maxTokensResponse, searchErrorResponse, pauseTurnResponse, continuationResponse, competitorAnswer, trendAnswer,
  errorBody, SEARCH_URLS,
} from '../fixtures/api/responses';

const competitor = { id: 'example-health', name: 'Example Health (fictional)' };
const now = new Date(2026, 0, 21, 10, 5);
const base = { competitor, apiKey: 'sk-ant-fixture-key-000', now };
const failure = async (promise) => {
  try { await promise; } catch (error) { return error; }
  throw new Error('expected a rejection');
};

describe('researchCompetitor', () => {
  it('turns a multi-block web-search response into a validated, unreviewed entry', async () => {
    const entry = await researchCompetitor({ ...base, fetchImpl: fakeFetch({ body: multiBlockResponse() }) });
    expect(entry.provenance).toEqual({
      kind: 'live', fetchedAt: now.toISOString(), model: 'model-under-test', dropped: { statements: 4, analysis: 3 },
    });
    expect(entry.data.id).toBe('example-health');
    expect(entry.data.name).toBe('Example Health (fictional)');
    expect(entry.data.asOf).toBe('2026-01-21');
    // f3 (no evidence), f4 (javascript: link) and f5 (page the search never returned) are gone
    expect(entry.data.facts.map((f) => f.id)).toEqual(['f1', 'f2']);
    // the channel without evidence is gone
    expect(entry.data.channels.map((c) => c.name)).toEqual(['Blog']);
    // analysis items survive only if every fact they rest on survived
    expect(entry.data.analysis.strengths.map((s) => s.text)).toEqual(['Rests on kept facts.']);
    expect(entry.data.analysis.gaps).toEqual([]);
    expect(entry.data.analysis.opportunitiesForUpmc.map((s) => s.text)).toEqual(['Rests on f1.']);
    // what is left passes the snapshot validator
    expect(validateCompetitorFile(entry.data, { expectedId: 'example-health' }).ok).toBe(true);
    for (const fact of entry.data.facts) for (const ev of fact.evidence) expect(ev.accessed).toBe('2026-01-21');
  });

  it('handles bare JSON split across blocks the same way', async () => {
    const entry = await researchCompetitor({ ...base, fetchImpl: fakeFetch({ body: bareJsonResponse() }) });
    expect(entry.data.facts.map((f) => f.id)).toEqual(['f1', 'f2']);
  });

  it('follows a paused turn to its end', async () => {
    const entry = await researchCompetitor({ ...base, fetchImpl: fakeFetch({ body: pauseTurnResponse() }, { body: continuationResponse() }) });
    expect(entry.data.facts.map((f) => f.id)).toEqual(['f1', 'f2']);
  });

  it.each([
    ['malformed JSON', () => ({ body: malformedJsonResponse() }), 'parse'],
    ['an answer without JSON', () => ({ body: emptyAnswerResponse() }), 'parse'],
    ['a refusal', () => ({ body: refusalResponse() }), 'refusal'],
    ['an answer cut off at max_tokens', () => ({ body: maxTokensResponse() }), 'truncated'],
    ['HTTP 401', () => ({ status: 401, body: errorBody('authentication_error', 'invalid x-api-key') }), 'auth'],
    ['HTTP 429', () => ({ status: 429, body: errorBody('rate_limit_error', 'rate limited') }), 'rate_limit'],
    ['HTTP 529', () => ({ status: 529, body: errorBody('overloaded_error', 'Overloaded') }), 'overloaded'],
    ['a network failure', () => ({ throw: new TypeError('Failed to fetch') }), 'network'],
  ])('fails with a typed error on %s', async (_label, reply, kind) => {
    const error = await failure(researchCompetitor({ ...base, fetchImpl: fakeFetch(reply()) }));
    expect(error).toBeInstanceOf(LiveResearchError);
    expect(error.kind).toBe(kind);
    expect(describeError(error)).toEqual({ kind, message: error.message });
    expect(error.message).not.toContain('sk-ant-fixture-key-000');
  });

  it('mentions a failed web search when no answer came back', async () => {
    const error = await failure(researchCompetitor({ ...base, fetchImpl: fakeFetch({ body: searchErrorResponse('max_uses_exceeded') }) }));
    expect(error.kind).toBe('parse');
    expect(error.message).toContain('max_uses_exceeded');
  });

  it('shows nothing when no fact has a source the search returned', async () => {
    const answer = JSON.parse(JSON.stringify(competitorAnswer));
    answer.facts.forEach((f) => { f.evidence = [{ url: 'https://example.com/fixture/made-up', title: 't', publisher: 'p' }]; });
    const error = await failure(researchCompetitor({ ...base, fetchImpl: fakeFetch({ body: multiBlockResponse(answer) }) }));
    expect(error.kind).toBe('empty');
  });
});

describe('sanitizeCompetitorAnswer', () => {
  const ctx = { competitor, today: '2026-01-21', searchUrls: SEARCH_URLS };

  it('keeps a fact when at least one of its sources is usable and drops the unusable sources', () => {
    const answer = JSON.parse(JSON.stringify(competitorAnswer));
    answer.facts[0].evidence.push({ url: 'javascript:alert(1)', title: 'x', publisher: 'y' }, { url: 'http://example.com/not-https', title: 'x', publisher: 'y' });
    const { data } = sanitizeCompetitorAnswer(answer, ctx);
    expect(data.facts[0].evidence.map((e) => e.url)).toEqual([SEARCH_URLS[1]]);
  });

  it('drops the positioning when it has no usable source, and still validates', () => {
    const answer = JSON.parse(JSON.stringify(competitorAnswer));
    answer.positioning.evidence = [];
    const { data, dropped } = sanitizeCompetitorAnswer(answer, ctx);
    expect(data.positioning).toBeUndefined();
    expect(dropped.statements).toBe(5);
  });

  it('fills in publisher and title from the address when the model left them out', () => {
    const answer = JSON.parse(JSON.stringify(competitorAnswer));
    answer.facts[0].evidence = [{ url: SEARCH_URLS[1] }];
    const { data } = sanitizeCompetitorAnswer(answer, ctx);
    expect(data.facts[0].evidence[0]).toMatchObject({ title: 'example.com', publisher: 'example.com', published: null, accessed: '2026-01-21' });
  });

  it('drops facts with a duplicate id or an unknown category', () => {
    const answer = JSON.parse(JSON.stringify(competitorAnswer));
    answer.facts[1].id = 'f1';
    expect(sanitizeCompetitorAnswer(answer, ctx).data.facts.map((f) => f.id)).toEqual(['f1']);
    const other = JSON.parse(JSON.stringify(competitorAnswer));
    other.facts[0].category = 'rumour';
    expect(sanitizeCompetitorAnswer(other, ctx).data.facts.map((f) => f.id)).toEqual(['f2']);
  });

  it('without a list of returned addresses it still requires https evidence', () => {
    const { data } = sanitizeCompetitorAnswer(competitorAnswer, { ...ctx, searchUrls: undefined });
    expect(data.facts.map((f) => f.id)).toEqual(['f1', 'f2', 'f5']);
  });

  it('rejects an answer that is not an object', () => {
    expect(() => sanitizeCompetitorAnswer('text', ctx)).toThrow(LiveResearchError);
  });
});

describe('researchTrend', () => {
  it('returns a validated trend marked as live, without the unsourced example', async () => {
    const trend = await researchTrend({ query: 'short video', apiKey: 'k', now, fetchImpl: fakeFetch({ body: multiBlockResponse(trendAnswer) }) });
    expect(trend.id).toBe(`live-${now.getTime()}`);
    expect(trend.provenance).toMatchObject({ kind: 'live', model: 'model-under-test', dropped: { statements: 1, analysis: 0 } });
    expect(trend.examples.map((e) => e.text)).toEqual(['Sourced example.']);
    expect(validateTrend(trend).ok).toBe(true);
  });

  it('shows nothing when the summary has no usable source', () => {
    const answer = JSON.parse(JSON.stringify(trendAnswer));
    answer.summary.evidence = [];
    expect(() => sanitizeTrendAnswer(answer, { id: 'live-1', today: '2026-01-21', searchUrls: SEARCH_URLS })).toThrow(/no statement with a usable source/);
  });

  it('rejects an answer whose fixed fields are not in the vocabulary', async () => {
    const answer = { ...trendAnswer, channel: 'Billboards' };
    const error = await failure(researchTrend({ query: 'q', apiKey: 'k', now, fetchImpl: fakeFetch({ body: multiBlockResponse(answer) }) }));
    expect(error.kind).toBe('validation');
    expect(error.message).toContain('channel');
  });
});

describe('messages', () => {
  it('describes unknown errors without leaking details', () => {
    expect(describeError(new Error('secret internals'))).toEqual({ kind: 'unexpected', message: 'Live research failed unexpectedly.' });
  });

  it('summarises what was dropped', () => {
    expect(droppedSummary({ statements: 0, analysis: 0 })).toMatch(/^No statements were dropped/);
    expect(droppedSummary({ statements: 1, analysis: 0 })).toBe('1 statement dropped (no usable source link).');
    expect(droppedSummary({ statements: 4, analysis: 3 })).toBe('4 statements dropped (no usable source link); 3 analysis points dropped (no sourced fact left to rest on).');
    expect(droppedSummary(undefined)).toBeNull();
  });
});
