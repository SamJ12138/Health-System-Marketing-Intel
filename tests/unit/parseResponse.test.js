import { describe, it, expect } from 'vitest';
import {
  collectText, finalAnswerText, extractJson, extractAnswer, collectSearchUrls, collectSearchErrors,
} from '../../src/lib/parseResponse';
import {
  multiBlockResponse, bareJsonResponse, malformedJsonResponse, emptyAnswerResponse, refusalResponse,
  searchErrorResponse, competitorAnswer, SEARCH_URLS,
} from '../fixtures/api/responses';

describe('extractJson', () => {
  it('reads a json code fence', () => {
    expect(extractJson('Here you go:\n```json\n{"a": 1}\n```\nDone.')).toEqual({ a: 1 });
  });

  it('reads a fence without a language tag', () => {
    expect(extractJson('```\n{"a": [1, 2]}\n```')).toEqual({ a: [1, 2] });
  });

  it('prefers the last fence that parses', () => {
    expect(extractJson('```json\n{"draft": true}\n```\nrevised:\n```json\n{"final": true}\n```')).toEqual({ final: true });
    expect(extractJson('```json\n{"good": true}\n```\n```json\n{"broken": \n```')).toEqual({ good: true });
  });

  it('reads bare JSON surrounded by prose', () => {
    expect(extractJson('The result is {"a": {"b": "c"}} as requested.')).toEqual({ a: { b: 'c' } });
  });

  it('is not confused by braces and quotes inside strings', () => {
    const value = { text: 'a } brace, a { brace and a \\"quote\\"', n: 1 };
    expect(extractJson(`Answer: ${JSON.stringify(value)}`)).toEqual(value);
  });

  it('skips prose in braces and takes the object that parses', () => {
    expect(extractJson('I will search {not json}. Result: {"a": 1}')).toEqual({ a: 1 });
  });

  it('recovers when a stray opening brace precedes the object', () => {
    expect(extractJson('Use the { character carefully. {"a": 1}')).toEqual({ a: 1 });
  });

  it('returns undefined for malformed JSON, arrays, plain text and non-strings', () => {
    for (const text of ['{"a": ', '```json\n{"a": 1,,}\n```', '[1, 2, 3]', 'no json here', '', null, undefined, 42]) {
      expect(extractJson(text)).toBeUndefined();
    }
  });
});

describe('response blocks', () => {
  it('collects all text blocks, not just the first', () => {
    const { content } = multiBlockResponse();
    expect(collectText(content)).toContain("I'll search for how this organization describes itself.");
    expect(collectText(content)).toContain('"positioning"');
  });

  it('takes the final answer from the text after the last search block', () => {
    const { content } = multiBlockResponse();
    const final = finalAnswerText(content);
    expect(final.startsWith('Based on the search results, the organization describes itself')).toBe(true);
    expect(final).not.toContain("I'll search");
  });

  it('extracts the answer from a multi-block web-search response (code fence)', () => {
    expect(extractAnswer(multiBlockResponse().content)).toEqual(competitorAnswer);
  });

  it('extracts bare JSON that is split across text blocks', () => {
    expect(extractAnswer(bareJsonResponse().content)).toEqual(competitorAnswer);
  });

  it('gives undefined for malformed JSON, an answer without JSON, and a refusal', () => {
    expect(extractAnswer(malformedJsonResponse().content)).toBeUndefined();
    expect(extractAnswer(emptyAnswerResponse().content)).toBeUndefined();
    expect(extractAnswer(refusalResponse().content)).toBeUndefined();
    expect(extractAnswer(undefined)).toBeUndefined();
  });

  it('lists the addresses the search tool returned, including cited ones', () => {
    expect(new Set(collectSearchUrls(multiBlockResponse().content))).toEqual(new Set(SEARCH_URLS));
    expect(collectSearchUrls(emptyAnswerResponse().content)).toEqual([]);
  });

  it('lists search errors reported inside a 200 response', () => {
    expect(collectSearchErrors(searchErrorResponse('too_many_requests').content)).toEqual(['too_many_requests']);
    expect(collectSearchErrors(multiBlockResponse().content)).toEqual([]);
  });
});
