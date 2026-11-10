import { motion } from 'motion/react';
import { X } from 'lucide-react';

export default function OpportunityItem({ item, onRemove }) {
  return (
    <motion.div
      className="glass-card rounded-xl p-4 flex items-start gap-4 card-border-shimmer"
      whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(0, 94, 184, 0.1)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      data-testid="opportunity"
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-display font-semibold text-sm text-txt-primary mb-1 truncate">{item.title}</h4>
        {item.description && <p className="text-xs text-txt-secondary leading-relaxed line-clamp-2">{item.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-txt-muted" title="A saved opportunity is the author's judgment">Analysis</span>
          {item.basedOn?.length > 0 && <span className="text-[11px] text-txt-subtle">based on {item.basedOn.join(', ')}</span>}
          {item.channel && <span className="px-2 py-0.5 bg-surface-2/60 rounded-md text-xs font-medium text-txt-secondary">{item.channel}</span>}
          {item.effort && <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${item.effort === 'Quick Win' ? 'tag-quick-win' : item.effort === 'Strategic Initiative' ? 'tag-strategic' : 'tag-medium'}`}>{item.effort}</span>}
          {item.impact && <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${item.impact === 'High' ? 'tag-high' : item.impact === 'Medium' ? 'tag-medium' : 'tag-low'}`}>{item.impact} Impact</span>}
          {item.unreviewed && <span className="px-2 py-0.5 rounded-md text-xs font-semibold tag-medium">From live research, unreviewed</span>}
        </div>
      </div>
      <button type="button" onClick={onRemove} aria-label={`Remove ${item.title}`} className="p-1 rounded-lg hover:bg-surface-2 transition-colors shrink-0">
        <X size={16} className="text-txt-muted" />
      </button>
    </motion.div>
  );
}
