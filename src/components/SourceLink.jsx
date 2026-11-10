import { ExternalLink } from 'lucide-react';
import { safeHttpUrl } from '../lib/safeUrl';
import { evidenceDateLabel, excerptLabel } from '../lib/format';

/** One source: title, publisher, date. A link only if the address is http(s). */
export function SourceLink({ evidence }) {
  const href = safeHttpUrl(evidence.url);
  const title = evidence.title || 'Source';
  const meta = [evidence.publisher, evidenceDateLabel(evidence)].filter(Boolean).join(', ');
  if (!href) {
    return (
      <span className="source-link source-link-withheld" data-testid="source-withheld">
        <span>{title}</span>
        {meta && <span className="source-meta">{meta}</span>}
        <span className="source-meta">(link withheld: not an http/https address)</span>
      </span>
    );
  }
  return (
    <a
      className="source-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={evidence.quote ? `“${evidence.quote}”` : undefined}
      data-testid="source-link"
    >
      <ExternalLink size={10} className="shrink-0 mt-[3px]" aria-hidden="true" />
      <span>
        <span className="source-title">{title}</span>
        {meta && <span className="source-meta"> {'·'} {meta}</span>}
      </span>
    </a>
  );
}

export function EvidenceList({ evidence, label = 'Sources' }) {
  if (!Array.isArray(evidence) || evidence.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1" aria-label={label}>
      {evidence.map((ev, i) => (
        <li key={i}>
          <SourceLink evidence={ev} />
          {typeof ev.quote === 'string' && ev.quote.trim() && (
            <p className="source-excerpt" data-testid="source-excerpt">
              <span className="source-excerpt-label">{excerptLabel(ev)}:</span> {ev.quote}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
