import { DISCLAIMER } from '../lib/disclaimer';

export default function Footer() {
  return (
    <footer className="border-t border-glass-border relative z-10" style={{ background: 'rgba(15, 23, 41, 0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="px-4 md:px-8 py-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-gradient-to-r from-brand-blue to-brand-navy text-white font-display font-bold text-xs px-2 py-1 rounded-md" aria-hidden="true">CI</div>
          <span className="text-xs text-txt-muted">Competitive Intelligence Dashboard</span>
        </div>
        <p className="text-xs text-txt-muted leading-relaxed max-w-3xl" data-testid="disclaimer">{DISCLAIMER}</p>
      </div>
    </footer>
  );
}
