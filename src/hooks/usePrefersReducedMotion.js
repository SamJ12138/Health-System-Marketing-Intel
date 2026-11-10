import { useMediaQuery } from './useMediaQuery';

/** True when the visitor's system asks for reduced motion. */
export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
