import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Animate an integer from its currently shown value to `target`.
 * The running animation is cancelled when `target` changes or the component
 * unmounts, and the next run starts from whatever is on screen.
 * With reduced motion the target is shown at once.
 */
export function useCountUp(target, duration) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (reduced) {
      shown.current = target;
      return undefined;
    }
    const start = shown.current;
    if (start === target) return undefined;
    let frame;
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const next = Math.round(start + (target - start) * easeOutCubic(progress));
      shown.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  return reduced ? target : display;
}
