import { describe, it, expect } from 'vitest';
import {
  requestResearch, LiveResearchError, API_URL, API_VERSION, WEB_SEARCH_TOOL, DEFAULT_MODEL, MODELS, MAX_TOKENS,
} from '../../src/lib/anthropicClient';
import {
  fakeFetch, multiBlockResponse, pauseTurnResponse, continuationResponse, refusalResponse, maxTokensResponse,
  errorBody, ERROR_CASES,
} from '../fixtures/api/responses';

const KEY = 'sk-ant-fixture-key-000';
const run = (fetchImpl, extra = {}) => requestResearch({ prompt: 'research prompt', apiKey: KEY, fetchImpl, ...extra });
const failure = async (promise) => {
  try { await promise; } catch (error) { return error; }
  throw new Error('expected a rejection');
};

describe('requestResearch: the request', () => {
  it('posts once to the Messages API with the key in a header only', async () => {
    const fetchImpl = fakeFetch({ body: multiBlockResponse() });
    await run(fetchImpl);
    expect(fetchImpl.calls).toHaveLength(1);
    const { url, init, body } = fetchImpl.calls[0];
    expect(url).toBe(API_URL);
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(url).not.toContain(KEY);
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key']).toBe(KEY);
    expect(init.headers['anthropic-version']).toBe(API_VERSION);
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(init.body).not.toContain(KEY);
    expect(body).toEqual({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      tools: [WEB_SEARCH_TOOL],
      messages: [{ role: 'user', content: 'research prompt' }],
    });
  });

  it('uses the documented tool type and a model from the list by default', () => {
    expect(WEB_SEARCH_TOOL).toEqual({ type: 'web_search_20250305', name: 'web_search', max_uses: 5 });
    expect(MODELS.map((m) => m.id)).toContain(DEFAULT_MODEL);
  });

  it('sends the model that was chosen', async () => {
    const fetchImpl = fakeFetch({ body: multiBlockResponse() });
    await run(fetchImpl, { model: 'claude-haiku-5-5' });
    expect(fetchImpl.calls[0].body.model).toBe('claude-haiku-5-5');
  });

  it('refuses to send anything without a key', async () => {
    const fetchImpl = fakeFetch();
    const error = await failure(requestResearch({ prompt: 'p', apiKey: '  ', fetchImpl }));
    expect(error).toBeInstanceOf(LiveResearchError);
    expect(error.kind).toBe('no_key');
    expect(fetchImpl.calls).toHaveLength(0);
  });
});

describe('requestResearch: stop reasons', () => {
  it('returns every content block of an end_turn response', async () => {
    const response = multiBlockResponse();
    const result = await run(fakeFetch({ body: response }));
    expect(result.blocks).toEqual(response.content);
    expect(result.stopReason).toBe('end_turn');
    expect(result.model).toBe('model-under-test');
  });

  it('continues a paused turn by sending the assistant content back unchanged', async () => {
    const paused = pauseTurnResponse();
    const rest = continuationResponse();
    const fetchImpl = fakeFetch({ body: paused }, { body: rest });
    const result = await run(fetchImpl);
    expect(fetchImpl.calls).toHaveLength(2);
    expect(fetchImpl.calls[1].body.messages).toEqual([
      { role: 'user', content: 'research prompt' },
      { role: 'assistant', content: paused.content },
    ]);
    expect(fetchImpl.calls[1].body.tools).toEqual([WEB_SEARCH_TOOL]);
    expect(result.blocks).toEqual([...paused.content, ...rest.content]);
    expect(result.stopReason).toBe('end_turn');
  });

  it('gives up after a bounded number of continuations', async () => {
    const fetchImpl = fakeFetch(...Array.from({ length: 4 }, () => ({ body: pauseTurnResponse() })));
    const error = await failure(run(fetchImpl));
    expect(error.kind).toBe('incomplete');
    expect(fetchImpl.calls).toHaveLength(4);
  });

  it('reports a refusal', async () => {
    const error = await failure(run(fakeFetch({ body: refusalResponse() })));
    expect(error).toBeInstanceOf(LiveResearchError);
    expect(error.kind).toBe('refusal');
    expect(error.message).toMatch(/declined/);
  });

  it('hands back a max_tokens response so the caller can decide', async () => {
    const result = await run(fakeFetch({ body: maxTokensResponse() }));
    expect(result.stopReason).toBe('max_tokens');
  });

  it('treats tool_use as unexpected, because the app defines no client tools', async () => {
    const body = { ...multiBlockResponse(), stop_reason: 'tool_use' };
    expect((await failure(run(fakeFetch({ body })))).kind).toBe('unexpected_stop');
  });
});

describe('requestResearch: errors', () => {
  it.each(ERROR_CASES)('maps HTTP $status ($type) to kind "$kind"', async ({ status, type, kind }) => {
    const error = await failure(run(fakeFetch({ status, body: errorBody(type, 'fixture message from the API') })));
    expect(error).toBeInstanceOf(LiveResearchError);
    expect(error.kind).toBe(kind);
    expect(error.status).toBe(status);
    expect(error.requestId).toBe('req_fixture_0001');
    expect(error.message).toContain(`(${status})`);
    expect(error.message).toContain('fixture message from the API');
    expect(error.message).not.toContain(KEY);
  });

  it('has a distinct message for each kind of failure', async () => {
    const messages = new Set();
    for (const { status, type } of ERROR_CASES) {
      const error = await failure(run(fakeFetch({ status, body: errorBody(type, '') })));
      messages.add(error.message);
    }
    expect(messages.size).toBe(ERROR_CASES.length);
  });

  it('adds the retry-after header to a rate-limit message', async () => {
    const error = await failure(run(fakeFetch({ status: 429, headers: { 'retry-after': '30' }, body: errorBody('rate_limit_error', 'slow down') })));
    expect(error.message).toContain('Retry after 30 s.');
  });

  it('copes with an error status that has no JSON body', async () => {
    const error = await failure(run(fakeFetch({ status: 502, invalidJson: true })));
    expect(error.kind).toBe('server');
    expect(error.message).toContain('502');
  });

  it('reports a network failure', async () => {
    const error = await failure(run(fakeFetch({ throw: new TypeError('Failed to fetch') })));
    expect(error.kind).toBe('network');
    expect(error.message).toMatch(/Could not reach api\.anthropic\.com/);
  });

  it('reports a cancelled request', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    expect((await failure(run(fakeFetch({ throw: abort })))).kind).toBe('aborted');
  });

  it('reports a 200 response that is not a message as a parse failure', async () => {
    expect((await failure(run(fakeFetch({ invalidJson: true })))).kind).toBe('parse');
    expect((await failure(run(fakeFetch({ body: { unexpected: true } })))).kind).toBe('parse');
  });
});
