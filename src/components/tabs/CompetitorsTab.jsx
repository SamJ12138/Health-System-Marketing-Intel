import { useState } from 'react';
import { motion } from 'motion/react';
import { Home, ChevronDown, ChevronUp } from 'lucide-react';
import CompetitorCard from '../CompetitorCard';
import ProvenanceBadge from '../ProvenanceBadge';

export default function CompetitorsTab({
  competitors, entries, snapshotEntries, homeSystem, homeEntry,
  loadingCompetitors, errors, onResearch, onDiscardLive, savedInsights, onToggleSave,
}) {
  const [homeOpen, setHomeOpen] = useState(false);
  // One competitor is open at a time; the open card spans the whole grid row.
  const [openId, setOpenId] = useState(null);
  return (
    <motion.div
      key="competitors"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {homeSystem && homeEntry && (
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
          aria-label={`Baseline system: ${homeSystem.name}`}
          data-testid="home-panel"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-txt-muted flex items-center gap-2">
              <Home size={13} aria-hidden="true" /> Baseline system: {homeSystem.name}
            </h2>
            <button
              type="button"
              onClick={() => setHomeOpen(!homeOpen)}
              aria-expanded={homeOpen}
              className="flex items-center gap-1 text-xs font-semibold text-accent-sky hover:text-accent-teal transition-colors"
            >
              {homeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {homeOpen ? 'Hide baseline' : `Show ${homeSystem.name} baseline`}
            </button>
          </div>
          {homeOpen ? (
            <CompetitorCard competitor={homeSystem} entry={homeEntry} home wide />
          ) : (
            <div className="glass-card px-6 py-4 flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="home-summary">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-display font-bold text-xs shrink-0"
                style={{ background: `linear-gradient(135deg, ${homeSystem.color}, ${homeSystem.color}cc)` }}
                aria-hidden="true"
              >
                {homeSystem.initials}
              </div>
              <p className="text-sm text-txt-secondary flex-1 min-w-[240px]">
                The system the analysis is written for, kept apart from the competitors below.
                {' '}{homeEntry.data.facts.length} sourced facts.
              </p>
              <ProvenanceBadge provenance={homeEntry.provenance} />
            </div>
          )}
        </motion.section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {competitors.map((comp, i) => (
          <motion.div
            key={comp.id}
            className={openId === comp.id ? 'min-w-0 lg:col-span-2 xl:col-span-3' : 'min-w-0'}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.06, ease: 'easeOut' }}
          >
            <CompetitorCard
              competitor={comp}
              entry={entries[comp.id]}
              expanded={openId === comp.id}
              onExpandedChange={(open) => setOpenId(open ? comp.id : null)}
              wide={openId === comp.id}
              hasSnapshot={!!snapshotEntries[comp.id]}
              isLoading={!!loadingCompetitors[comp.id]}
              error={errors[comp.id] || null}
              onResearch={onResearch}
              onDiscardLive={onDiscardLive}
              isSaved={savedInsights.has(`comp-${comp.id}`)}
              onToggleSave={onToggleSave}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
