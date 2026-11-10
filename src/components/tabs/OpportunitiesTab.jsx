import { motion } from 'motion/react';
import { Filter, Bookmark, Building2, TrendingUp } from 'lucide-react';
import OpportunityItem from '../OpportunityItem';
import { filterOpportunities, summarizeOpportunities } from '../../lib/opportunities';

export default function OpportunitiesTab({ opportunities, filters, onFiltersChange, onRemove, onNavigate, channelOptions, effortOptions, impactOptions }) {
  const filteredOpportunities = filterOpportunities(opportunities, filters);
  const summary = summarizeOpportunities(opportunities);
  return (
    <motion.div
      key="opportunities"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {opportunities.length > 0 && (
        <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-3">
          <Filter size={16} className="text-txt-muted" />
          <span className="text-xs font-semibold text-txt-muted uppercase tracking-wider">Filter:</span>
          <select value={filters.channel} onChange={e => onFiltersChange({ ...filters, channel: e.target.value })} className="px-3 py-1.5 border border-surface-3 rounded-lg text-xs text-txt-secondary bg-surface-1 focus:outline-none focus:ring-2 focus:ring-accent-sky/20">
            <option value="">All Channels</option>
            {channelOptions.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>
          <select value={filters.effort} onChange={e => onFiltersChange({ ...filters, effort: e.target.value })} className="px-3 py-1.5 border border-surface-3 rounded-lg text-xs text-txt-secondary bg-surface-1 focus:outline-none focus:ring-2 focus:ring-accent-sky/20">
            <option value="">All Effort Levels</option>
            {effortOptions.map(ef => <option key={ef} value={ef}>{ef}</option>)}
          </select>
          <select value={filters.impact} onChange={e => onFiltersChange({ ...filters, impact: e.target.value })} className="px-3 py-1.5 border border-surface-3 rounded-lg text-xs text-txt-secondary bg-surface-1 focus:outline-none focus:ring-2 focus:ring-accent-sky/20">
            <option value="">All Impact</option>
            {impactOptions.map(im => <option key={im} value={im}>{im}</option>)}
          </select>
          {(filters.channel || filters.effort || filters.impact) && (
            <button onClick={() => onFiltersChange({ channel: '', effort: '', impact: '' })} className="text-xs text-accent-sky hover:text-accent-teal font-semibold">Clear Filters</button>
          )}
        </div>
      )}
      {filteredOpportunities.length > 0 ? (
        <div className="space-y-3">{filteredOpportunities.map(op => <OpportunityItem key={op.id} item={op} onRemove={() => onRemove(op.id)} />)}</div>
      ) : opportunities.length > 0 ? (
        <div className="text-center py-16"><Filter size={40} className="text-surface-3 mx-auto mb-4" /><p className="text-txt-muted text-sm">No opportunities match your current filters.</p></div>
      ) : (
        <div className="text-center py-16 glass-card">
          <Bookmark size={40} className="text-surface-3 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg text-txt-primary mb-2">No Opportunities Saved Yet</h3>
          <p className="text-sm text-txt-muted max-w-md mx-auto mb-6">Browse the Competitors and Trends tabs, then click the bookmark icon on any insight to save it here.</p>
          <div className="flex gap-3 justify-center">
            <motion.button onClick={() => onNavigate('competitors')} className="px-4 py-2 bg-gradient-to-r from-brand-blue to-brand-navy text-white rounded-xl text-sm font-semibold btn-glow flex items-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}><Building2 size={15} /> View Competitors</motion.button>
            <motion.button onClick={() => onNavigate('trends')} className="px-4 py-2 border border-surface-3 rounded-xl text-sm font-semibold text-txt-secondary hover:bg-surface-2 transition-colors flex items-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}><TrendingUp size={15} /> View Trends</motion.button>
          </div>
        </div>
      )}
      {opportunities.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="glass-card rounded-xl p-4 text-center stat-gradient-blue"><p className="font-display font-bold text-2xl text-accent-rose">{summary.highImpact}</p><p className="text-xs text-txt-muted font-medium mt-1">High Impact</p></div>
          <div className="glass-card rounded-xl p-4 text-center stat-gradient-emerald"><p className="font-display font-bold text-2xl text-accent-emerald">{summary.quickWins}</p><p className="text-xs text-txt-muted font-medium mt-1">Quick Wins</p></div>
          <div className="glass-card rounded-xl p-4 text-center stat-gradient-teal"><p className="font-display font-bold text-2xl text-accent-sky">{summary.strategic}</p><p className="text-xs text-txt-muted font-medium mt-1">Strategic</p></div>
        </div>
      )}
    </motion.div>
  );
}
