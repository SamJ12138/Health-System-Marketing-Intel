import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark, BookmarkCheck, Target, Shield, ChevronDown, ChevronUp, Star, Scale } from 'lucide-react';
import { EvidenceList } from './SourceLink';
import ProvenanceBadge from './ProvenanceBadge';
import { droppedSummary } from '../lib/liveResearch';

const sectionLabel = 'text-xs font-semibold text-txt-muted uppercase tracking-wider';

export default function TrendCard({ trend, isSaved = false, onToggleSave }) {
  const [expanded, setExpanded] = useState(false);
  const analysis = trend.analysis || {};
  const relevanceClass = analysis.relevance === 'HIGH' ? 'tag-high' : analysis.relevance === 'MEDIUM' ? 'tag-medium' : 'tag-low';
  const effortClass = analysis.effort === 'Quick Win' ? 'tag-quick-win' : analysis.effort === 'Strategic Initiative' ? 'tag-strategic' : 'tag-medium';
  const hasAnalysisBody = analysis.note || analysis.recommendation || analysis.challenges?.length > 0;

  return (
    <motion.div
      className="glass-card p-6 card-border-shimmer"
      whileHover={{
        y: -3,
        boxShadow: '0 6px 28px rgba(0, 94, 184, 0.12), 0 0 40px rgba(0, 94, 184, 0.05)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      data-testid="trend-card"
      data-trend-id={trend.id}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {(analysis.relevance || analysis.effort) && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-txt-muted" title="Relevance and effort are the author's judgment">Analysis</span>
            )}
            {analysis.relevance && <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${relevanceClass}`}>{analysis.relevance} Relevance</span>}
            {analysis.effort && <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${effortClass}`}>{analysis.effort}</span>}
            {trend.channel && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-2/60 text-txt-secondary">{trend.channel}</span>}
          </div>
          <h3 className="font-display font-bold text-lg text-txt-primary">{trend.topic}</h3>
          <div className="mt-2"><ProvenanceBadge provenance={trend.provenance} /></div>
          {trend.provenance?.kind === 'live' && (
            <p className="text-[11px] text-txt-subtle mt-2 leading-snug" data-testid="live-note">
              Written by a language model with web search and not checked by a person. {droppedSummary(trend.provenance.dropped)}
            </p>
          )}
        </div>
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(`trend-${trend.id}`)}
            className="p-2 rounded-lg hover:bg-surface-2 transition-colors shrink-0 ml-2"
            aria-pressed={isSaved}
            aria-label={isSaved ? `Remove "${trend.topic}" from opportunities` : `Save "${trend.topic}" to opportunities`}
          >
            {isSaved ? <BookmarkCheck size={18} className="text-accent-amber" /> : <Bookmark size={18} className="text-txt-muted" />}
          </button>
        )}
      </div>

      {trend.summary && (
        <div className="mb-4">
          <p className="text-sm text-txt-secondary leading-relaxed">{trend.summary.text}</p>
          <EvidenceList evidence={trend.summary.evidence} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex items-center gap-1 text-xs font-semibold text-accent-sky hover:text-accent-teal transition-colors mb-2"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Less Details' : 'Examples & Analysis'}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-4 mt-3">
              {trend.examples?.length > 0 && (
                <div>
                  <p className={`${sectionLabel} mb-2`}>Examples</p>
                  <ul className="space-y-3">
                    {trend.examples.map((example, i) => (
                      <li key={i} className="text-sm text-txt-secondary flex gap-2" data-testid="trend-example">
                        <Star size={13} className="text-accent-amber shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          {example.text}
                          <EvidenceList evidence={example.evidence} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasAnalysisBody && (
                <div
                  className="rounded-xl p-4 border border-accent-sky/15 space-y-3"
                  style={{ background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.08), rgba(56, 189, 248, 0.04))' }}
                  data-testid="analysis"
                >
                  <div>
                    <p className="text-xs font-bold text-accent-sky uppercase tracking-wider flex items-center gap-1.5">
                      <Scale size={13} aria-hidden="true" /> Analysis
                    </p>
                    <p className="text-[11px] text-txt-subtle mt-1 leading-snug">The author&apos;s judgment, not a sourced statement.</p>
                  </div>
                  {analysis.note && (
                    <div data-testid="analysis-note">
                      <p className={`${sectionLabel} mb-1.5`}>Reading of the evidence</p>
                      <p className="text-sm text-txt-secondary leading-relaxed">{analysis.note}</p>
                    </div>
                  )}
                  {analysis.recommendation && (
                    <div>
                      <p className={`${sectionLabel} mb-1.5 flex items-center gap-1.5`}><Target size={13} aria-hidden="true" /> Recommendation for UPMC</p>
                      <p className="text-sm text-txt-secondary leading-relaxed">{analysis.recommendation}</p>
                    </div>
                  )}
                  {analysis.challenges?.length > 0 && (
                    <div>
                      <p className={`${sectionLabel} mb-2`}>Challenges</p>
                      <ul className="space-y-1.5">
                        {analysis.challenges.map((c, i) => (
                          <li key={i} className="text-sm text-txt-secondary flex gap-2">
                            <Shield size={13} className="text-accent-amber shrink-0 mt-0.5" aria-hidden="true" /><span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
