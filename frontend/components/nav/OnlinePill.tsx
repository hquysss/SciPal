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

  const label = online
    ? lang === 'en' ? 'Online' : 'Trực tuyến'
    : lang === 'en' ? 'Offline' : 'Ngoại tuyến';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-xs transition ${
        online
          ? 'bg-[color-mix(in_srgb,var(--nav-ink)_12%,transparent)] text-nav-ink border border-[color-mix(in_srgb,var(--nav-ink)_30%,transparent)]'
          : 'bg-[color-mix(in_srgb,var(--nav-ink)_12%,transparent)] text-nav-ink border border-[color-mix(in_srgb,var(--nav-ink)_30%,transparent)]'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full shadow-xs ${
          online ? 'bg-success animate-pulse' : 'bg-danger'
        }`}
      />
      <span className="hidden sm:inline font-mono">{label}</span>
    </span>
  );
}
