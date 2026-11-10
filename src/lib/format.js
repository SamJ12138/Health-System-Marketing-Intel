/** Date shown next to a source: the date the page states, or a plain note that it states none. */
export function evidenceDateLabel(evidence) {
  if (evidence.published) return String(evidence.published);
  return 'date not shown on page';
}

/**
 * Label for the supporting text stored with a source. The text was captured
 * through a fetch tool that returns short excerpts (sometimes fragments), so
 * it is presented as an excerpt, not as an exact quotation.
 */
export function excerptLabel(evidence) {
  return evidence.accessed ? `Excerpt (retrieved ${evidence.accessed})` : 'Excerpt';
}

const pad = (n) => String(n).padStart(2, '0');

/** Local "YYYY-MM-DD HH:MM" for an ISO timestamp; empty string if it cannot be read. */
export function formatTimestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Text of the provenance badge. */
export function provenanceLabel(provenance) {
  if (!provenance) return '';
  if (provenance.kind === 'live') {
    return ['Live research', 'unreviewed', formatTimestamp(provenance.fetchedAt), provenance.model].filter(Boolean).join(' · ');
  }
  return ['Verified snapshot', provenance.asOf].filter(Boolean).join(' · ');
}
