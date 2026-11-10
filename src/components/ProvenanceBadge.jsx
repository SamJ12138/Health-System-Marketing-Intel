import { ShieldCheck, Radio } from 'lucide-react';
import { provenanceLabel } from '../lib/format';

/** Says where a card's content comes from: the checked snapshot or an unreviewed live answer. */
export default function ProvenanceBadge({ provenance }) {
  if (!provenance) return null;
  const live = provenance.kind === 'live';
  const Icon = live ? Radio : ShieldCheck;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${live ? 'tag-medium' : 'tag-low'}`}
      data-testid="provenance-badge"
      data-kind={provenance.kind}
    >
      <Icon size={11} aria-hidden="true" />
      {provenanceLabel(provenance)}
    </span>
  );
}
