import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { MODELS, DEFAULT_MODEL } from '../lib/anthropicClient';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const CUSTOM = '__custom__';

/**
 * Connection settings for live research: API key and model.
 * The key lives in React state only (this component while typing, App after
 * saving). It is never written to storage.
 */
export default function ApiKeyModal({ initialModel = DEFAULT_MODEL, connected = false, onSave, onClose, onDisconnect }) {
  const [key, setKey] = useState('');
  const known = MODELS.some((m) => m.id === initialModel);
  const [choice, setChoice] = useState(known ? initialModel : CUSTOM);
  const [customModel, setCustomModel] = useState(known ? '' : initialModel);
  const dialogRef = useRef(null);
  const keyInputRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const model = choice === CUSTOM ? customModel.trim() : choice;
  const canSave = key.trim().length > 0 && model.length > 0;

  // Escape closes the dialog wherever focus is, including after a click on its text.
  useEffect(() => {
    const onDocumentKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => document.removeEventListener('keydown', onDocumentKeyDown);
  }, [onClose]);

  // Focus moves into the dialog on open and back to where it was on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    keyInputRef.current?.focus();
    return () => { if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus(); };
  }, []);

  const onKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (canSave) onSave({ apiKey: key.trim(), model });
  };

  const inputClass = 'w-full px-4 py-3 bg-surface-0 border border-surface-3 rounded-xl text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:ring-2 focus:ring-accent-sky/30 focus:border-accent-sky transition-all';

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onKeyDown={onKeyDown}
        className="glass-card bg-surface-1 max-w-md w-full p-5 md:p-8 max-h-[92vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{ boxShadow: '0 0 60px rgba(0, 94, 184, 0.1), 0 25px 50px rgba(0, 0, 0, 0.5)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 id={titleId} className="font-display text-xl font-bold text-txt-primary">Connect Claude API</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 hover:bg-surface-2 rounded-lg transition-colors">
            <X size={20} className="text-txt-muted" />
          </button>
        </div>
        <div id={descId} className="text-txt-secondary text-sm mb-5 leading-relaxed space-y-2">
          <p>Live research is optional. It sends a research question to the Anthropic API with web search switched on and shows the answer marked as unreviewed.</p>
          <p>
            Your key goes straight from this browser to <span className="text-txt-primary font-medium">api.anthropic.com</span> and nowhere else.
            It is kept in this page&apos;s memory only: it is not written to browser storage, cookies or the address bar, and it is gone when you reload or close the tab.
          </p>
          <p className="text-accent-amber">Anyone with access to this browser tab while it is open could read it. Use a key you can revoke.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor={`${titleId}-key`} className="block text-xs font-semibold text-txt-muted uppercase tracking-wider mb-1.5">Anthropic API key</label>
            <input
              id={`${titleId}-key`}
              ref={keyInputRef}
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
              spellCheck={false}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label htmlFor={`${titleId}-model`} className="block text-xs font-semibold text-txt-muted uppercase tracking-wider mb-1.5">Model</label>
            <select id={`${titleId}-model`} value={choice} onChange={(e) => setChoice(e.target.value)} className={inputClass}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              <option value={CUSTOM}>Other model id...</option>
            </select>
            {choice !== CUSTOM && <p className="text-[11px] text-txt-subtle mt-1.5 font-mono break-all">Model id: {choice}</p>}
            {choice === CUSTOM && (
              <input
                type="text"
                aria-label="Model id"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="model id"
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} font-mono mt-2`}
              />
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <motion.button
              type="submit"
              disabled={!canSave}
              className="flex-1 bg-gradient-to-r from-brand-blue to-brand-navy text-white py-3 rounded-xl font-display font-semibold text-sm btn-glow disabled:opacity-40 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
              Save &amp; Connect
            </motion.button>
            <button type="button" onClick={onClose} className="px-6 py-3 border border-surface-3 rounded-xl text-txt-secondary text-sm hover:bg-surface-2 transition-colors">
              Cancel
            </button>
          </div>
          {connected && onDisconnect && (
            <button type="button" onClick={onDisconnect} className="w-full text-xs font-semibold text-accent-rose hover:underline pt-1">
              Forget the key held in this tab
            </button>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
}
