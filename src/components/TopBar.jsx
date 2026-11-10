import { AlertCircle, ShieldCheck } from 'lucide-react';

export default function TopBar({ title, subtitle, showConnect, onConnect, snapshotLabel }) {
  return (
    <header className="sticky top-0 z-30 border-b border-glass-border" style={{ background: 'rgba(11, 17, 32, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="px-4 md:px-8 py-3 md:py-4 flex flex-wrap xl:flex-nowrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 xl:flex-1">
          <h1 className="font-display font-bold text-lg text-txt-primary">{title}</h1>
          <p className="text-xs text-txt-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 min-w-0 xl:shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${snapshotLabel ? 'tag-low' : 'text-txt-muted border border-glass-border'}`}
            data-testid="snapshot-date"
          >
            <ShieldCheck size={14} aria-hidden="true" />
            {snapshotLabel ? `Snapshot · ${snapshotLabel}` : 'No verified snapshot loaded'}
          </div>
          {showConnect && (
            <button
              type="button"
              onClick={onConnect}
              aria-label="Connect API for live research"
              className="connect-hint flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium"
            >
              <AlertCircle size={15} aria-hidden="true" />
              <span className="md:hidden">Connect API</span>
              <span className="hidden md:inline">Connect API for live research</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
