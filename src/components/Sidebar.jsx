import { ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';
import { tabConfig } from './tabConfig';

export default function Sidebar({ activeTab, onTabChange, connected, model, onApiClick }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="badge-glow bg-gradient-to-br from-brand-blue to-brand-navy text-white font-display font-bold text-xl px-3 py-1.5 rounded-lg tracking-tight"
          >
            CI
          </div>
        </div>
        <h2 className="font-display font-bold text-sm text-txt-primary leading-tight">
          Competitive Intelligence
        </h2>
        <p className="text-xs text-txt-muted mt-0.5">Health-system digital marketing</p>
      </div>

      {/* Personal Project Badge */}
      <div className="mx-4 mb-4 px-3 py-2.5 rounded-lg border border-glass-border" style={{ background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.08), rgba(167, 139, 250, 0.06))' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={12} className="text-accent-sky" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent-sky">Independent Project</span>
        </div>
        <p className="text-[11px] text-txt-muted leading-snug">
          By <span className="text-txt-secondary font-semibold">Sam Jia</span>. Not affiliated with UPMC or any organization named here.
        </p>
      </div>

      <div className="mx-6 border-t border-glass-border mb-4" />

      <div className="px-6 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-txt-muted">Navigation</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-0">
        {tabConfig.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`sidebar-item text-left ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              {isActive && (
                <span className="ml-auto flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-sky opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-sky" />
                  </span>
                  <ChevronRight size={14} className="opacity-60" />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* API Status */}
      <div className="mt-auto p-4 border-t border-glass-border">
        <button
          onClick={onApiClick}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            connected
              ? 'text-accent-emerald border border-accent-emerald/20'
              : 'text-txt-muted border border-glass-border hover:border-surface-3'
          }`}
          style={{ background: connected ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255,255,255,0.03)' }}
        >
          {connected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-accent-emerald animate-glow" />
              <span className="text-xs text-left leading-tight">API Connected<span className="block text-[10px] opacity-70">{model}</span></span>
              <CheckCircle2 size={14} className="ml-auto" />
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-txt-muted" />
              <span className="text-xs">Connect Claude API</span>
              <Sparkles size={14} className="ml-auto" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
