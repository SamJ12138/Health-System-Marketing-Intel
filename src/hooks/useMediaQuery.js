import { useSyncExternalStore } from 'react';

const media = (query) => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null);

/** True while the CSS media query matches. False where matchMedia does not exist. */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = media(query);
      mq?.addEventListener?.('change', onChange);
      return () => mq?.removeEventListener?.('change', onChange);
    },
    () => media(query)?.matches === true,
    () => false,
  );
}
