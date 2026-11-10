import { describe, it, expect } from 'vitest';
import { safeHttpUrl, isHttpsUrl, comparableUrl } from '../../src/lib/safeUrl';

describe('safeHttpUrl', () => {
  it('accepts http and https addresses', () => {
    expect(safeHttpUrl('https://example.com/a?b=1#c')).toBe('https://example.com/a?b=1#c');
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com/');
    expect(safeHttpUrl('  https://example.com/x  ')).toBe('https://example.com/x');
  });

  it.each([
    ['javascript:alert(1)'],
    ['JavaScript:alert(1)'],
    [' javascript:alert(1)'],
    ['java\nscript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
    ['vbscript:msgbox(1)'],
    ['file:///etc/passwd'],
    ['blob:https://example.com/123'],
    ['mailto:someone@example.com'],
    ['//example.com/protocol-relative'],
    ['/relative/path'],
    ['example.com'],
    [''],
    ['   '],
  ])('rejects %j', (value) => {
    expect(safeHttpUrl(value)).toBeNull();
  });

  it('rejects values that are not strings', () => {
    for (const value of [null, undefined, 42, {}, ['https://example.com']]) expect(safeHttpUrl(value)).toBeNull();
  });
});

describe('isHttpsUrl', () => {
  it('is true only for https', () => {
    expect(isHttpsUrl('https://example.com/')).toBe(true);
    expect(isHttpsUrl('http://example.com/')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('comparableUrl', () => {
  it('ignores fragment, trailing slash, host case and a leading www', () => {
    expect(comparableUrl('https://WWW.Example.com/a/#top')).toBe(comparableUrl('https://example.com/a'));
    expect(comparableUrl('https://example.com/a?x=1')).not.toBe(comparableUrl('https://example.com/a?x=2'));
    expect(comparableUrl('nope')).toBeNull();
  });
});
