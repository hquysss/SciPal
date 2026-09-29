'use client';

import { useEffect } from 'react';

/** Installs the service worker (public/sw.js) in production builds; dev keeps the network only. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Without it the site still works online; nothing to tell the reader.
    });
  }, []);
  return null;
}
