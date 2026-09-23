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
          ? 'bg-emerald-900/40 text-emerald-100 border border-emerald-400/40'
          : 'bg-rose-950/50 text-rose-200 border border-rose-400/40'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full shadow-xs ${
          online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
        }`}
      />
      <span className="hidden sm:inline font-mono">{label}</span>
    </span>
  );
}
