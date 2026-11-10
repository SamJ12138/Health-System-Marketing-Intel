import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Bookmark, BookmarkCheck, Loader2, AlertCircle, CheckCircle2, Globe, Zap,
  RefreshCw, Lightbulb, ChevronDown, ChevronUp, Scale, Undo2,
} from 'lucide-react';
import { ShimmerBlock } from './Shimmer';
import { EvidenceList } from './SourceLink';
import ProvenanceBadge from './ProvenanceBadge';
import { safeHttpUrl } from '../lib/safeUrl';
import { droppedSummary } from '../lib/liveResearch';

const sectionLabel = 'text-xs font-semibold text-txt-muted uppercase tracking-wider';

function ChannelChip({ channel }) {
  const href = safeHttpUrl(channel.url);
  const className = 'inline-flex items-center gap-1 px-2.5 py-1 bg-surface-2/60 rounded-full text-xs font-medium text-txt-secondary';
  const content = (<><Globe size={10} aria-hidden="true" /> {channel.name}</>);
  if (!href) return <span className={className}>{content}</span>;
  return (
    <a className={`${className} hover:text-accent-sky transition-colors`} href={href} target="_blank" rel="noopener noreferrer" title={channel.note || undefined}>
      {content}
    </a>
  );
}

function AnalysisList({ title, icon: Icon, iconClass, items, listKey, active, onShowFacts }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <p className={`${sectionLabel} mb-2`}>{title}</p>
      <ul className="space-y-2.5">
        {items.map((item, i) => {
          const itemKey = `${listKey}-${i}`;
          return (
            <li key={itemKey} className="text-sm text-txt-secondary flex gap-2" data-testid="analysis-item">
              <Icon size={14} className={`${iconClass} shrink-0 mt-0.5`} aria-hidden="true" />
              <span>
                {item.text}
                <span className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[11px] text-txt-subtle">Based on</span>
                  {item.basedOn.map((factId) => (
                    <button
                      key={factId}
                      type="button"
                      className="fact-id"
                      aria-pressed={active === itemKey}
                      aria-label={`Show fact ${factId}`}
                      onClick={() => onShowFacts(itemKey, item.basedOn, factId)}
                    >
                      {factId}
                    </button>
                  ))}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function CompetitorCard({
  competitor, entry, isLoading = false, onResearch, isSaved = false, onToggleSave,
  onDiscardLive, hasSnapshot = false, home = false, error = null,
  expanded: expandedProp, onExpandedChange, wide = false,
}) {
  // Expansion is controlled by the grid (so the open card can take the full
  // width) and falls back to local state when the card is used on its own.
  const [expandedLocal, setExpandedLocal] = useState(false);
  const expanded = expandedProp ?? expandedLocal;
  const setExpanded = (next) => { setExpandedLocal(next); onExpandedChange?.(next); };
  const [highlight, setHighlight] = useState({ key: null, ids: [] });
  const factRefs = useRef({});
  const data = entry?.data;
  const provenance = entry?.provenance;
  const hasData = !!data;
  const isLive = provenance?.kind === 'live';
  const analysis = data?.analysis || {};
  const hasAnalysis = ['strengths', 'gaps', 'opportunitiesForUpmc'].some((k) => analysis[k]?.length > 0);

  const showFacts = (key, ids, focusId) => {
    setHighlight((prev) => (prev.key === key ? { key: null, ids: [] } : { key, ids }));
    const el = factRefs.current[focusId];
    if (el && typeof el.scrollIntoView === 'function') {
      const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  return (
    <motion.div
      className="glass-card overflow-hidden card-border-shimmer"
      whileHover={{
        y: -4,
        boxShadow: '0 8px 32px rgba(0, 94, 184, 0.15), 0 0 48px rgba(0, 94, 184, 0.06)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      data-testid="competitor-card"
      data-competitor-id={competitor.id}
      data-has-data={hasData ? 'true' : 'false'}
    >
      {/* Colored top accent bar */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${competitor.color}, ${competitor.color}88, transparent)`,
          boxShadow: `0 0 12px ${competitor.color}40`,
        }}
      />
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm shrink-0"
              style={{ background: `linear-gradient(135deg, ${competitor.color}, ${competitor.color}cc)`, boxShadow: `0 0 16px ${competitor.color}40` }}
              aria-hidden="true"
            >
              {competitor.initials}
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-txt-primary">{competitor.name}</h3>
              <span className="text-xs text-txt-muted font-medium">{home ? 'Baseline system' : 'Healthcare System'}</span>
            </div>
          </div>
          {hasData && !home && onToggleSave && analysis.opportunitiesForUpmc?.length > 0 && (
            <button
              type="button"
              onClick={() => onToggleSave(`comp-${competitor.id}`)}
              className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
              aria-pressed={isSaved}
              aria-label={isSaved ? `Remove ${competitor.name} from opportunities` : `Save ${competitor.name} to opportunities`}
            >
              {isSaved ? <BookmarkCheck size={18} className="text-accent-amber" /> : <Bookmark size={18} className="text-txt-muted" />}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="px-6 pb-6 space-y-3">
          <div className="flex items-center gap-2 text-accent-sky text-sm font-medium">
            <Loader2 size={16} className="animate-spin" />
            <span>Researching {competitor.shortName}...</span>
          </div>
          <ShimmerBlock className="h-4 w-full" />
          <ShimmerBlock className="h-4 w-4/5" />
          <ShimmerBlock className="h-4 w-3/4" />
        </div>
      ) : hasData ? (
        <div className="px-6 pb-6 space-y-4">
          <div>
            <ProvenanceBadge provenance={provenance} />
            {isLive && (
              <p className="text-[11px] text-txt-subtle mt-2 leading-snug" data-testid="live-note">
                Written by a language model with web search and not checked by a person. {droppedSummary(provenance.dropped)}
              </p>
            )}
          </div>

          {data.positioning && (
            <div>
              <p className={`${sectionLabel} mb-1.5`}>Positioning</p>
              <p className="text-sm text-txt-secondary leading-relaxed">{data.positioning.text}</p>
              {data.positioning.quote && (
                <p className="text-sm text-txt-primary leading-relaxed mt-1.5">
                  <span className="text-[11px] text-txt-subtle">In its own words (excerpt): </span>
                  <span className="italic">{data.positioning.quote}</span>
                </p>
              )}
              <EvidenceList evidence={data.positioning.evidence} />
            </div>
          )}

          {data.channels?.length > 0 && (
            <div>
              <p className={`${sectionLabel} mb-2`}>Official channels</p>
              <div className="flex flex-wrap gap-1.5">
                {data.channels.map((ch, i) => <ChannelChip key={i} channel={ch} />)}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="flex items-center gap-1 text-xs font-semibold text-accent-sky hover:text-accent-teal transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Show Less' : `View ${data.facts?.length || 0} Facts & Analysis`}
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
                <div className={wide ? 'grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5 items-start mt-1' : 'space-y-5'}>
                  <div>
                    <p className={`${sectionLabel} mb-1`}>Facts</p>
                    <ul className="space-y-1">
                      {data.facts.map((fact) => (
                        <li
                          key={fact.id}
                          ref={(el) => { factRefs.current[fact.id] = el; }}
                          className={`fact-row ${highlight.ids.includes(fact.id) ? 'fact-highlight' : ''}`}
                          data-testid="fact"
                          data-fact-id={fact.id}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="fact-id">{fact.id}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-txt-muted">{fact.category}</span>
                          </div>
                          <p className="text-sm text-txt-secondary leading-relaxed">{fact.text}</p>
                          <EvidenceList evidence={fact.evidence} label={`Sources for fact ${fact.id}`} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-5">
                    {hasAnalysis && (
                      <div
                        className="rounded-xl p-4 border border-accent-sky/15 space-y-4"
                        style={{ background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.08), rgba(56, 189, 248, 0.04))' }}
                        data-testid="analysis"
                      >
                        <div>
                          <p className="text-xs font-bold text-accent-sky uppercase tracking-wider flex items-center gap-1.5">
                            <Scale size={13} aria-hidden="true" /> Analysis
                          </p>
                          <p className="text-[11px] text-txt-subtle mt-1 leading-snug">
                            The author&apos;s judgment, not a sourced statement. Each point names the facts it rests on; select one to see them.
                          </p>
                        </div>
                        <AnalysisList title="Strengths" icon={CheckCircle2} iconClass="text-accent-emerald" items={analysis.strengths} listKey="strengths" active={highlight.key} onShowFacts={showFacts} />
                        <AnalysisList title="Observable gaps" icon={AlertCircle} iconClass="text-accent-amber" items={analysis.gaps} listKey="gaps" active={highlight.key} onShowFacts={showFacts} />
                        {!home && (
                          <AnalysisList title="Opportunities for UPMC" icon={Zap} iconClass="text-accent-amber" items={analysis.opportunitiesForUpmc} listKey="opportunities" active={highlight.key} onShowFacts={showFacts} />
                        )}
                      </div>
                    )}

                    {data.channels?.length > 0 && (
                      <div>
                        <p className={`${sectionLabel} mb-2`}>Channel details</p>
                        <ul className="space-y-2.5">
                          {data.channels.map((ch, i) => (
                            <li key={i} className="text-sm text-txt-secondary">
                              <span className="font-medium text-txt-primary">{ch.name}</span>
                              {ch.note && <span data-testid="channel-note">: {ch.note}</span>}
                              <EvidenceList evidence={ch.evidence} label={`Sources for ${ch.name}`} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="px-6 pb-6" data-testid="no-data">
          <p className="text-sm text-txt-secondary font-medium flex items-center gap-2">
            <Lightbulb size={14} className="text-txt-muted" aria-hidden="true" /> No verified data yet
          </p>
          <p className="text-xs text-txt-subtle mt-1.5 leading-relaxed">
            Nothing is shown for {competitor.name} until a sourced snapshot exists.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="mx-6 mb-4 p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(251, 113, 133, 0.08)', border: '1px solid rgba(251, 113, 133, 0.2)' }} data-testid="research-error">
          <AlertCircle size={15} className="text-accent-rose shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-accent-rose">Live research failed</p>
            <p className="text-xs text-accent-rose/80 mt-0.5 leading-snug">{error}</p>
          </div>
        </div>
      )}

      {!home && onResearch && (
        <div className="px-6 py-4 border-t border-glass-border space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <motion.button
            type="button"
            onClick={() => onResearch(competitor.id)}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-brand-blue to-brand-navy text-white relative overflow-hidden"
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0, 94, 184, 0.4), 0 0 60px rgba(0, 94, 184, 0.15)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <span className="btn-shimmer" />
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (<><Loader2 size={15} className="animate-spin" />Researching...</>) : isLive ? (<><RefreshCw size={15} />Run Live Research Again</>) : (<><Search size={15} />Run Live Research</>)}
            </span>
          </motion.button>
          {isLive && hasSnapshot && onDiscardLive && (
            <button
              type="button"
              onClick={() => onDiscardLive(competitor.id)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-txt-secondary border border-surface-3 hover:bg-surface-2 transition-colors"
            >
              <Undo2 size={13} /> Back to verified snapshot
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
