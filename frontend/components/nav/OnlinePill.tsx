'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';

export function OnlinePill() {
  const { lang } = useLanguage();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Being online is the normal state; the bar only speaks up when the connection drops.
  if (online) return null;

  return (
    <span
      role="status"
      className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--nav-ink)_30%,transparent)] bg-[color-mix(in_srgb,var(--nav-ink)_12%,transparent)] px-3 text-xs font-semibold text-nav-ink"
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-danger" />
      {lang === 'en' ? 'Offline' : 'Ngoại tuyến'}
    </span>
  );
}
