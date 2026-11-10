import { motion } from 'motion/react';
import { Search, Loader2, Sparkles, AlertCircle, TrendingUp, UserPlus, Heart, FileText, DollarSign, Cpu } from 'lucide-react';
import TrendCard from '../TrendCard';
import { LoadingCard } from '../Shimmer';

const categoryIcons = { UserPlus, Heart, FileText, DollarSign, Cpu };

export default function TrendsTab({ trends, trendCategories, trendSearch, onTrendSearchChange, onSearch, loadingTrend, error, savedInsights, onToggleSave }) {
  return (
    <motion.div
      key="trends"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      <div className="glass-card p-6 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input type="text" value={trendSearch} onChange={e => onTrendSearchChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSearch(trendSearch); }}
              placeholder='Search trends, e.g. "healthcare email marketing trends" ...'
              className="w-full pl-11 pr-4 py-3 bg-surface-0 border border-surface-3 rounded-xl text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-2 focus:ring-accent-sky/30 focus:border-accent-sky transition-all" disabled={loadingTrend} />
          </div>
          <motion.button
            onClick={() => onSearch(trendSearch)}
            disabled={loadingTrend || !trendSearch.trim()}
            className="px-6 py-3 bg-gradient-to-r from-brand-blue to-brand-navy text-white rounded-xl font-display font-semibold text-sm btn-glow disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
          >
            {loadingTrend ? (<><Loader2 size={15} className="animate-spin" />Searching...</>) : (<><Sparkles size={15} />Research</>)}
          </motion.button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-xs font-semibold text-txt-muted uppercase tracking-wider self-center mr-1">Quick:</span>
          {trendCategories.map(cat => {
            const Icon = categoryIcons[cat.icon] || TrendingUp;
            return (
              <button key={cat.id} onClick={() => { onTrendSearchChange(cat.query); onSearch(cat.query); }} disabled={loadingTrend}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2/50 hover:bg-surface-2 border border-glass-border rounded-lg text-xs font-medium text-txt-secondary transition-all disabled:opacity-50">
                <Icon size={13} />{cat.label}
              </button>
            );
          })}
        </div>
        {error && (
          <div className="mt-3 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(251, 113, 133, 0.08)', border: '1px solid rgba(251, 113, 133, 0.2)' }}>
            <AlertCircle size={15} className="text-accent-rose" /><p className="text-xs text-accent-rose">{error}</p>
          </div>
        )}
      </div>
      {loadingTrend && <div className="mb-6"><LoadingCard /></div>}
      {trends.length === 0 && !loadingTrend && (
        <div className="glass-card p-8 text-center" data-testid="no-trends">
          <p className="text-sm text-txt-secondary font-medium">No verified trends yet</p>
          <p className="text-xs text-txt-muted mt-1.5">Nothing is shown here until a sourced snapshot exists.</p>
        </div>
      )}
      <div className="space-y-4">
        {trends.map((trend, i) => (
          <motion.div
            key={trend.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
          >
            <TrendCard trend={trend} isSaved={savedInsights.has(`trend-${trend.id}`)} onToggleSave={onToggleSave} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
