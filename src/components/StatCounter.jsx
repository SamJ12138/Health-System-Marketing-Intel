import { useCountUp } from '../hooks/useCountUp';

// Animated counter on the landing page.
export default function StatCounter({ label, endValue }) {
  const count = useCountUp(endValue, 1200);
  return (
    <div className="text-center">
      <p className="font-display font-bold text-3xl text-accent-sky">{count}</p>
      <p className="text-xs text-txt-muted uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}
