import { motion } from 'motion/react';
import { FileText, Sparkles, CheckCircle2, Copy, Download, RefreshCw } from 'lucide-react';

const COPY_MESSAGES = {
  copied: 'Copied to the clipboard.',
  failed: 'Could not copy. Select the text below and copy it by hand.',
};

export default function ReportTab({ reportMarkdown, showReport, onGenerate, onCopy, onDownload, copyState = 'idle' }) {
  return (
    <motion.div
      key="report"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {!showReport ? (
        <div className="glass-card p-6 md:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(0, 94, 184, 0.12)' }}>
            <FileText size={32} className="text-accent-sky" />
          </div>
          <h3 className="font-display font-bold text-xl text-txt-primary mb-3">Generate Intelligence Report</h3>
          <p className="text-sm text-txt-muted max-w-lg mx-auto mb-8">Compile the sourced facts, the labelled analysis, the trends and your saved opportunities into a Markdown report. Every fact keeps its source link.</p>
          <motion.button
            onClick={onGenerate}
            className="px-8 py-3 bg-gradient-to-r from-brand-blue to-brand-navy text-white rounded-xl font-display font-semibold text-sm btn-glow flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
          >
            <Sparkles size={16} />Generate Report
          </motion.button>
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {['Summary', 'Baseline system', 'Competitors', 'Trends', 'Saved opportunities'].map(s => (
              <span key={s} className="px-2.5 py-0.5 bg-surface-2/50 rounded-md text-xs text-txt-muted">{s}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-accent-emerald" /><span className="text-sm font-semibold text-txt-primary">Report Generated</span></div>
            <div className="flex flex-wrap gap-2">
              <motion.button onClick={onCopy} className="flex items-center gap-1.5 px-3 py-2 bg-surface-2/50 hover:bg-surface-2 border border-glass-border rounded-lg text-xs font-semibold text-txt-secondary transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}><Copy size={13} /> Copy</motion.button>
              <motion.button onClick={onDownload} className="flex items-center gap-1.5 px-3 py-2 bg-surface-2/50 hover:bg-surface-2 border border-glass-border rounded-lg text-xs font-semibold text-txt-secondary transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}><Download size={13} /> Download .md</motion.button>
              <motion.button onClick={onGenerate} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-brand-blue to-brand-navy text-white rounded-lg text-xs font-semibold btn-glow" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}><RefreshCw size={13} /> Regenerate</motion.button>
            </div>
          </div>
          {COPY_MESSAGES[copyState] && (
            <p role="status" className={`text-xs font-semibold ${copyState === 'failed' ? 'text-accent-rose' : 'text-accent-emerald'}`}>{COPY_MESSAGES[copyState]}</p>
          )}
          <div className="glass-card p-4 md:p-8 max-h-[70vh] overflow-y-auto">
            <pre data-testid="report-text" className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm text-txt-secondary leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{reportMarkdown}</pre>
          </div>
        </div>
      )}
    </motion.div>
  );
}
