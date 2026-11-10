// Browser client for the live-research feature: one POST to the Anthropic
// Messages API with the web search server tool.
//
// Values below were read from the API documentation on 2026-11-10
// (platform.claude.com/docs: web search tool, models overview, handling
// stop reasons, errors). This client has only been exercised against
// fixtures shaped like those documents, never against the real API.
//
// The API key is passed in per call and used for the request header only.
// This module does not store it, log it, or put it in a URL.

export const API_URL = 'https://api.anthropic.com/v1/messages';
export const API_VERSION = '2023-06-01';

// "web_search_20250305" is the basic web search tool and is listed as
// available on all models. The newer versions (20260209, 20260318) add
// dynamic filtering through code execution, which this app does not use.
export const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 5 };

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
  { id: 'claude-fable-5-2', label: 'Claude Fable 5.2' },
];
// The models overview calls Opus 5.5 the recommended starting point.
export const DEFAULT_MODEL = 'claude-opus-5-5';
export const MAX_TOKENS = 8000;
const MAX_CONTINUATIONS = 3;

const MESSAGES = {
  auth: 'The API key was not accepted (401). Check that it is complete and still active.',
  billing: 'The API reported a billing problem on this account (402).',
  permission: 'This API key is not allowed to use this model or the web search tool (403).',
  not_found: 'The API did not find what was asked for (404). The model id may be wrong or retired; choose another model in the connection settings.',
  invalid_request: 'The API rejected the request (400).',
  too_large: 'The request was too large for the API (413).',
  rate_limit: 'A rate or spend limit was reached (429). Wait and try again.',
  server: 'The API had an internal error (500). Try again later.',
  timeout: 'The API timed out while processing the request (504). Try again.',
  overloaded: 'The API is temporarily overloaded (529). Try again in a minute.',
  http: 'The API answered with an unexpected status.',
  network: 'Could not reach api.anthropic.com. Check the connection; a content blocker or network filter that stops cross-site requests has the same effect.',
  aborted: 'The request was cancelled.',
  parse: 'The answer did not contain a JSON object that could be read.',
  refusal: 'The model declined to answer this request.',
  truncated: 'The answer was cut off before it was complete (token limit reached).',
  incomplete: 'The search did not finish within the allowed number of continuation requests.',
  unexpected_stop: 'The API stopped the turn in a way this app does not handle.',
  empty: 'The answer contained no statement with a usable source link, so nothing is shown.',
  validation: 'The answer did not match the expected format after filtering, so nothing is shown.',
  no_key: 'No API key is connected.',
};

const KIND_BY_STATUS = {
  400: 'invalid_request', 401: 'auth', 402: 'billing', 403: 'permission', 404: 'not_found',
  413: 'too_large', 429: 'rate_limit', 500: 'server', 504: 'timeout', 529: 'overloaded',
};

/** Every failure of the live-research path is one of these, with a `kind` the UI can rely on. */
export class LiveResearchError extends Error {
  constructor(kind, { detail, status, requestId, cause } = {}) {
    const base = MESSAGES[kind] || MESSAGES.http;
    super(detail ? `${base} ${detail}` : base, cause ? { cause } : undefined);
    this.name = 'LiveResearchError';
    this.kind = kind;
    this.status = status;
    this.requestId = requestId;
  }
}

async function post({ body, apiKey, fetchImpl, signal }) {
  let response;
  try {
    response = await fetchImpl(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        // Required by the API for requests sent straight from a browser.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    throw new LiveResearchError(cause?.name === 'AbortError' ? 'aborted' : 'network', { cause });
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const kind = KIND_BY_STATUS[response.status] || (response.status >= 500 ? 'server' : 'http');
    const parts = [];
    const apiMessage = payload?.error?.message;
    if (typeof apiMessage === 'string' && apiMessage) parts.push(`The API said: "${apiMessage}"`);
    const retryAfter = response.headers?.get?.('retry-after');
    if (kind === 'rate_limit' && retryAfter) parts.push(`Retry after ${retryAfter} s.`);
    if (!KIND_BY_STATUS[response.status]) parts.push(`(status ${response.status})`);
    throw new LiveResearchError(kind, { detail: parts.join(' '), status: response.status, requestId: payload?.request_id });
  }
  if (!payload || !Array.isArray(payload.content)) {
    throw new LiveResearchError('parse', { detail: 'The response body was not a message.', status: response.status });
  }
  return payload;
}

/**
 * Run one research turn. Follows "pause_turn" by sending the assistant
 * content back unchanged, up to a fixed number of times.
 * Returns { blocks, stopReason, model } where blocks is all content received.
 */
export async function requestResearch({ prompt, apiKey, model = DEFAULT_MODEL, fetchImpl = globalThis.fetch, signal }) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new LiveResearchError('no_key');
  const userMessage = { role: 'user', content: prompt };
  const blocks = [];
  let reportedModel = model;

  for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt += 1) {
    const messages = blocks.length ? [userMessage, { role: 'assistant', content: blocks }] : [userMessage];
    const payload = await post({
      body: { model, max_tokens: MAX_TOKENS, tools: [WEB_SEARCH_TOOL], messages },
      apiKey,
      fetchImpl,
      signal,
    });
    blocks.push(...payload.content);
    if (typeof payload.model === 'string' && payload.model) reportedModel = payload.model;

    switch (payload.stop_reason) {
      case 'pause_turn':
        continue; // the server-tool loop hit its limit: ask again with what we have
      case 'refusal':
        throw new LiveResearchError('refusal');
      case 'tool_use':
        // This app defines no client tools, so there is nothing to answer with.
        throw new LiveResearchError('unexpected_stop', { detail: '(stop_reason "tool_use")' });
      case 'end_turn':
      case 'stop_sequence':
      case 'max_tokens':
      case 'model_context_window_exceeded':
        return { blocks, stopReason: payload.stop_reason, model: reportedModel };
      default:
        return { blocks, stopReason: payload.stop_reason ?? null, model: reportedModel };
    }
  }
  throw new LiveResearchError('incomplete');
}

export const TRUNCATING_STOP_REASONS = new Set(['max_tokens', 'model_context_window_exceeded']);
