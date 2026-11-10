import { motion } from 'motion/react';
import AnimatedNumber from './AnimatedNumber';

const STAT_GRADIENTS = ['stat-gradient-blue', 'stat-gradient-teal', 'stat-gradient-gold', 'stat-gradient-emerald'];

export default function StatsRow({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: 'easeOut' }}
            className={`glass-card rounded-xl p-3 md:p-4 flex items-center gap-3 card-hover min-w-0 ${STAT_GRADIENTS[i]}`}
            data-testid="stat-tile"
          >
            <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <Icon size={20} className={stat.color} />
            </div>
            <div className="min-w-0">
              <AnimatedNumber value={stat.value} className="font-display font-bold text-2xl text-txt-primary" />
              <p className="text-xs text-txt-muted font-medium leading-snug break-words">{stat.label}</p>
              {stat.note && <p className="text-[11px] text-accent-amber font-medium leading-snug break-words">{stat.note}</p>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
