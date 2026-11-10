// Reading a Messages API response that used the web search server tool.
// Such a response is a list of content blocks: text, server_tool_use,
// web_search_tool_result, more text (some with citations). The answer is
// not "the first text block"; it is the text after the last tool block.

const TOOL_BLOCK_TYPES = new Set(['server_tool_use', 'web_search_tool_result']);

const textOf = (blocks) => blocks.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('');

/** All text blocks of the response, concatenated in order. */
export function collectText(blocks) {
  return textOf(Array.isArray(blocks) ? blocks : []);
}

/** Text blocks that come after the last server-tool block: the final answer. */
export function finalAnswerText(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  let lastTool = -1;
  list.forEach((b, i) => { if (TOOL_BLOCK_TYPES.has(b?.type)) lastTool = i; });
  return textOf(list.slice(lastTool + 1));
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function tryParseObject(candidate, requiredKeys) {
  try {
    const value = JSON.parse(candidate);
    if (!isPlainObject(value)) return undefined;
    return requiredKeys.every((key) => key in value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Top-level {...} spans in the text, found by matching braces outside JSON strings. */
function braceSpans(text) {
  const spans = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"' && depth > 0) inString = true;
    else if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0) spans.push(text.slice(start, i + 1));
    }
  }
  return spans;
}

/**
 * The JSON object in a piece of model output: the last code-fenced block that
 * parses, otherwise the last bare {...} that parses. Returns undefined if none.
 *
 * options.requiredKeys: top-level keys the answer must have. Without them, a
 * cut-off answer could be mistaken for one of its own complete inner objects.
 */
export function extractJson(text, { requiredKeys = [] } = {}) {
  if (typeof text !== 'string' || !text.trim()) return undefined;
  const fenced = [...text.matchAll(/```[a-zA-Z0-9]*[ \t]*\r?\n?([\s\S]*?)```/g)].map((m) => m[1]);
  for (const candidate of fenced.reverse()) {
    const value = tryParseObject(candidate.trim(), requiredKeys);
    if (value) return value;
  }
  for (const candidate of braceSpans(text).reverse()) {
    const value = tryParseObject(candidate, requiredKeys);
    if (value) return value;
  }
  // A stray "{" in the prose hides everything after it from the scan above.
  // Retry from each later "{" (bounded, the text is a single model answer).
  const starts = [...text.matchAll(/\{/g)].map((m) => m.index).slice(1, 200);
  for (const start of starts) {
    const [candidate] = braceSpans(text.slice(start));
    const value = candidate && tryParseObject(candidate, requiredKeys);
    if (value) return value;
  }
  return undefined;
}

/** The JSON answer of a whole response: looked for in the final answer first, then in all text. */
export function extractAnswer(blocks, options) {
  return extractJson(finalAnswerText(blocks), options) ?? extractJson(collectText(blocks), options);
}

/** Addresses the web search tool actually returned in this response (results and citations). */
export function collectSearchUrls(blocks) {
  const urls = [];
  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (block?.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      block.content.forEach((r) => { if (r?.type === 'web_search_result' && typeof r.url === 'string') urls.push(r.url); });
    }
    if (block?.type === 'text' && Array.isArray(block.citations)) {
      block.citations.forEach((c) => { if (typeof c?.url === 'string') urls.push(c.url); });
    }
  }
  return urls;
}

/** Error codes of searches that failed inside an otherwise successful response. */
export function collectSearchErrors(blocks) {
  const codes = [];
  for (const block of Array.isArray(blocks) ? blocks : []) {
    const c = block?.type === 'web_search_tool_result' ? block.content : null;
    if (c && !Array.isArray(c) && c.type === 'web_search_tool_result_error') codes.push(c.error_code || 'unknown');
  }
  return codes;
}
