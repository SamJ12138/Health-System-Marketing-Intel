// Response fixtures for the live-research client. The shapes follow the
// Messages API and web search tool documentation as read on 2026-11-10
// (content block types: text, server_tool_use, web_search_tool_result with
// web_search_result items, text with web_search_result_location citations;
// stop_reason values; error body {type:"error", error:{type,message}, request_id}).
// The content is invented: fictional organization, example.com links.
// Nothing here was recorded from a real API call.

export const SEARCH_URLS = [
  'https://example.com/fixture/example-health/about',
  'https://example.com/fixture/example-health/blog',
  'https://example.com/fixture/example-health/video',
];

const ev = (url, title) => ({ url, title, publisher: 'Example Publisher (fictional)', published: null, accessed: '2026-01-21' });

/** What the model is asked to return for a competitor, as an object. */
export const competitorAnswer = {
  positioning: { text: 'Example Health (fictional) describes itself as a community system.', evidence: [ev(SEARCH_URLS[0], 'About')] },
  facts: [
    { id: 'f1', category: 'content', text: 'Fixture fact with a returned source.', evidence: [ev(SEARCH_URLS[1], 'Blog')] },
    { id: 'f2', category: 'channel', text: 'Fixture fact with a second returned source.', evidence: [ev(SEARCH_URLS[2], 'Video')] },
    { id: 'f3', category: 'metric', text: 'Fixture fact with no evidence at all.', evidence: [] },
    { id: 'f4', category: 'campaign', text: 'Fixture fact whose link is not a web address.', evidence: [ev('javascript:alert(1)', 'Bad')] },
    { id: 'f5', category: 'program', text: 'Fixture fact citing a page the search never returned.', evidence: [ev('https://example.com/fixture/never-returned', 'Unseen')] },
  ],
  channels: [
    { name: 'Blog', url: SEARCH_URLS[1], evidence: [ev(SEARCH_URLS[1], 'Blog')] },
    { name: 'Unsourced channel', url: 'https://example.com/fixture/unsourced', evidence: [] },
  ],
  analysis: {
    strengths: [{ text: 'Rests on kept facts.', basedOn: ['f1', 'f2'] }, { text: 'Rests only on a dropped fact.', basedOn: ['f3'] }],
    gaps: [{ text: 'Rests on one kept and one dropped fact.', basedOn: ['f2', 'f5'] }],
    opportunitiesForUpmc: [{ text: 'Has no basis.', basedOn: [] }, { text: 'Rests on f1.', basedOn: ['f1'] }],
  },
};

export const trendAnswer = {
  topic: 'Short video explainers (fixture trend)',
  summary: { text: 'Fixture summary.', evidence: [ev(SEARCH_URLS[0], 'About')] },
  examples: [
    { text: 'Sourced example.', evidence: [ev(SEARCH_URLS[1], 'Blog')] },
    { text: 'Unsourced example.', evidence: [] },
  ],
  channel: 'Social',
  analysis: { relevance: 'HIGH', effort: 'Quick Win', recommendation: 'Fixture recommendation.', challenges: ['Fixture challenge'] },
};

const searchBlocks = (id, query, urls) => [
  { type: 'server_tool_use', id, name: 'web_search', input: { query } },
  {
    type: 'web_search_tool_result',
    tool_use_id: id,
    content: urls.map((url) => ({ type: 'web_search_result', url, title: 'Fixture result', encrypted_content: 'ZmFrZQ==', page_age: null })),
  },
];

const message = (content, stop_reason = 'end_turn', extra = {}) => ({
  id: 'msg_fixture_01',
  type: 'message',
  role: 'assistant',
  model: 'model-under-test',
  content,
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 100, output_tokens: 200, server_tool_use: { web_search_requests: 2 } },
  ...extra,
});

const fenced = (obj) => `\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\``;

/** Preamble text, two searches, a cited sentence, then the final JSON in a code fence. */
export function multiBlockResponse(answer = competitorAnswer) {
  return message([
    { type: 'text', text: "I'll search for how this organization describes itself." },
    ...searchBlocks('srvtoolu_fixture_01', 'example health about', SEARCH_URLS.slice(0, 2)),
    { type: 'text', text: 'Let me look for their video channel {not json}.' },
    ...searchBlocks('srvtoolu_fixture_02', 'example health video', SEARCH_URLS.slice(2)),
    { type: 'text', text: 'Based on the search results, ' },
    {
      type: 'text',
      text: 'the organization describes itself as a community system.',
      citations: [{ type: 'web_search_result_location', url: SEARCH_URLS[0], title: 'About', encrypted_index: 'ZmFrZQ==', cited_text: 'a community system' }],
    },
    { type: 'text', text: `\n\nHere is the result:\n\n${fenced(answer)}` },
  ]);
}

/** Same turn, but the final answer is bare JSON split across two text blocks. */
export function bareJsonResponse(answer = competitorAnswer) {
  const json = JSON.stringify(answer);
  const cut = Math.floor(json.length / 2);
  return message([
    { type: 'text', text: 'Searching.' },
    ...searchBlocks('srvtoolu_fixture_01', 'example health', SEARCH_URLS),
    { type: 'text', text: json.slice(0, cut) },
    { type: 'text', text: json.slice(cut) },
  ]);
}

export function malformedJsonResponse() {
  return message([
    { type: 'text', text: 'Searching.' },
    ...searchBlocks('srvtoolu_fixture_01', 'example health', SEARCH_URLS),
    { type: 'text', text: '```json\n{ "positioning": { "text": "cut off in the middle", \n```' },
  ]);
}

/** stop_reason "refusal": HTTP 200, no usable answer. */
export function refusalResponse() {
  return message([], 'refusal', { stop_details: { type: 'refusal', category: 'fixture_category' } });
}

/** A normal end of turn whose text holds no JSON at all. */
export function emptyAnswerResponse() {
  return message([{ type: 'text', text: 'I could not find anything about this organization.' }]);
}

/** The server-tool loop hit its iteration limit: a search was started and has no result yet. */
export function pauseTurnResponse() {
  return message([
    { type: 'text', text: 'Searching.' },
    ...searchBlocks('srvtoolu_fixture_01', 'example health about', SEARCH_URLS.slice(0, 2)),
    { type: 'server_tool_use', id: 'srvtoolu_fixture_02', name: 'web_search', input: { query: 'example health video' } },
  ], 'pause_turn');
}

/** The continuation of a paused turn. */
export function continuationResponse(answer = competitorAnswer) {
  return message([
    { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_fixture_02', content: SEARCH_URLS.slice(2).map((url) => ({ type: 'web_search_result', url, title: 'Fixture result', encrypted_content: 'ZmFrZQ==', page_age: null })) },
    { type: 'text', text: fenced(answer) },
  ]);
}

export function maxTokensResponse() {
  return message([
    { type: 'text', text: 'Searching.' },
    ...searchBlocks('srvtoolu_fixture_01', 'example health', SEARCH_URLS),
    { type: 'text', text: '```json\n{ "positioning": { "text": "This answer stops because the token limit was rea' },
  ], 'max_tokens');
}

/** A search that failed inside a 200 response: content is one error object, not a list. */
export function searchErrorResponse(errorCode = 'max_uses_exceeded') {
  return message([
    { type: 'text', text: 'Searching.' },
    { type: 'server_tool_use', id: 'srvtoolu_fixture_01', name: 'web_search', input: { query: 'example health' } },
    { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_fixture_01', content: { type: 'web_search_tool_result_error', error_code: errorCode } },
    { type: 'text', text: 'I was unable to search, so I have no sourced answer.' },
  ]);
}

export function errorBody(type, text) {
  return { type: 'error', error: { type, message: text }, request_id: 'req_fixture_0001' };
}

export const ERROR_CASES = [
  { status: 400, type: 'invalid_request_error', kind: 'invalid_request' },
  { status: 401, type: 'authentication_error', kind: 'auth' },
  { status: 402, type: 'billing_error', kind: 'billing' },
  { status: 403, type: 'permission_error', kind: 'permission' },
  { status: 404, type: 'not_found_error', kind: 'not_found' },
  { status: 413, type: 'request_too_large', kind: 'too_large' },
  { status: 429, type: 'rate_limit_error', kind: 'rate_limit' },
  { status: 500, type: 'api_error', kind: 'server' },
  { status: 504, type: 'timeout_error', kind: 'timeout' },
  { status: 529, type: 'overloaded_error', kind: 'overloaded' },
];

/** A fetch stand-in that answers from a queue and records what it was sent. */
export function fakeFetch(...replies) {
  const calls = [];
  const queue = [...replies];
  const impl = async (url, init) => {
    calls.push({ url, init, body: init?.body ? JSON.parse(init.body) : undefined });
    const next = queue.shift();
    if (!next) throw new Error('fakeFetch: no reply queued');
    if (next.throw) throw next.throw;
    const status = next.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name) => (next.headers || {})[name.toLowerCase()] ?? null },
      json: async () => {
        if (next.invalidJson) throw new SyntaxError('Unexpected token < in JSON');
        return next.body;
      },
    };
  };
  impl.calls = calls;
  return impl;
}
