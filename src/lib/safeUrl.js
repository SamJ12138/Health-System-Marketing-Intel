// Only http: and https: addresses are ever turned into links. Evidence URLs
// come from JSON files and, in live research, from a language model, so a
// "javascript:" or "data:" value must never reach an href.

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/** Returns the normalised absolute URL if it is http(s), otherwise null. */
export function safeHttpUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null; // relative or malformed: not a source we can point at
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
  if (!parsed.hostname) return null;
  return parsed.href;
}

/** Stricter check used for the verified snapshot: https only. */
export function isHttpsUrl(value) {
  const href = safeHttpUrl(value);
  return href !== null && href.startsWith('https://');
}

/** Form used to compare two addresses for "is this the same page". */
export function comparableUrl(value) {
  const href = safeHttpUrl(value);
  if (!href) return null;
  const u = new URL(href);
  u.hash = '';
  const path = u.pathname.replace(/\/+$/, '');
  return `${u.protocol}//${u.host.toLowerCase().replace(/^www\./, '')}${path}${u.search}`;
}
