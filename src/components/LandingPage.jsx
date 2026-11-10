import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap, ArrowRight, Building2, TrendingUp, Link2, ShieldCheck } from 'lucide-react';
import StatCounter from './StatCounter';
import { DISCLAIMER } from '../lib/disclaimer';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/**
 * stats: numbers computed from the loaded data (see computeStats).
 * snapshotLabel: date of the verified snapshot, or null when none is loaded.
 */
export default function LandingPage({ onEnter, stats, snapshotLabel }) {
  const reduced = usePrefersReducedMotion();
  const [exiting, setExiting] = useState(false);
  const [typed, setTyped] = useState('');
  const [subtitleShown, setSubtitleShown] = useState(false);
  const [restShown, setRestShown] = useState(false);
  const fullText = 'Competitive';
  // With reduced motion nothing is typed out or staged: the whole page is there at once.
  const typedText = reduced ? fullText : typed;
  const showSubtitle = reduced || subtitleShown;
  const showRest = reduced || restShown;

  useEffect(() => {
    if (reduced) return undefined;
    let i = 0;
    let interval;
    const timers = [];
    const startDelay = setTimeout(() => {
      interval = setInterval(() => {
        i++;
        setTyped(fullText.slice(0, i));
        if (i >= fullText.length) {
          clearInterval(interval);
          timers.push(setTimeout(() => setSubtitleShown(true), 300));
          timers.push(setTimeout(() => setRestShown(true), 600));
        }
      }, 70);
    }, 800);
    return () => { clearTimeout(startDelay); clearInterval(interval); timers.forEach(clearTimeout); };
  }, [reduced]);

  const handleEnter = () => {
    if (reduced) { onEnter(); return; }
    setExiting(true);
    setTimeout(onEnter, 600);
  };

  return (
    <div className={`landing-container noise-bg ${exiting ? 'landing-exit' : ''}`}>
      {/* Ambient orbs */}
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />

      {/* Horizontal scan line */}
      <div className="scan-line" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 py-6 max-w-2xl">
        {/* Monogram (no organization's name or logo) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-5"
        >
          <div
            className="inline-block bg-gradient-to-br from-brand-blue to-brand-navy text-white font-display font-bold text-3xl px-5 py-2 rounded-2xl tracking-tight"
            style={{ boxShadow: '0 0 50px rgba(0, 94, 184, 0.35), 0 0 100px rgba(0, 94, 184, 0.12)' }}
          >
            CI
          </div>
        </motion.div>

        {/* Main title with typing effect */}
        <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] mb-4">
          <span className="gradient-text">
            {typedText}
            {!reduced && <span className="typing-cursor" aria-hidden="true">|</span>}
          </span>
          <br />
          <motion.span
            className="text-txt-primary"
            initial={{ opacity: 0, y: 20 }}
            animate={showSubtitle ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            Intelligence
          </motion.span>
        </h1>

        {/* Animated stat counters */}
        <AnimatePresence>
          {showRest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-8 mb-5"
            >
              <StatCounter label="Systems with data" endValue={stats.systemsWithData} />
              <StatCounter label="Sourced facts" endValue={stats.facts} />
              <StatCounter label="Linked sources" endValue={stats.sources} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtitle */}
        <AnimatePresence>
          {showRest && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display font-semibold text-lg sm:text-xl text-txt-secondary tracking-wide mb-4"
            >
              Health-system digital marketing
            </motion.p>
          )}
        </AnimatePresence>

        {/* Divider line */}
        <div className="landing-line mb-5" />

        {/* Personal project badge */}
        <AnimatePresence>
          {showRest && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6"
            >
              <div
                className="inline-flex flex-col items-center gap-1.5 px-6 py-3 rounded-xl border border-glass-border"
                style={{ background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.08), rgba(167, 139, 250, 0.06))' }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-accent-sky" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-sky">Independent Project</span>
                  <Sparkles size={14} className="text-accent-sky" />
                </div>
                <p className="text-xs text-txt-secondary leading-relaxed" data-testid="disclaimer">{DISCLAIMER}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Button */}
        <AnimatePresence>
          {showRest && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <motion.button
                onClick={handleEnter}
                className="landing-btn group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-blue to-brand-navy text-white rounded-2xl font-display font-bold text-base relative overflow-hidden"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="btn-shimmer" />
                <Zap size={18} className="relative z-10" />
                <span className="relative z-10">Initialize Dashboard</span>
                <ArrowRight size={20} className="relative z-10 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature pills */}
        <AnimatePresence>
          {showRest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-2 mt-6"
            >
              {[
                { icon: Building2, label: `${stats.systemsTracked} systems` },
                { icon: TrendingUp, label: `${stats.trends} trends` },
                { icon: Link2, label: 'Every fact sourced' },
                { icon: ShieldCheck, label: snapshotLabel ? `Snapshot ${snapshotLabel}` : 'No snapshot loaded' },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <span
                    key={feat.label}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-glass-border text-xs font-medium text-txt-muted"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <Icon size={13} className="text-txt-secondary" />
                    {feat.label}
                  </span>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
