'use client';
import { useEffect, useState } from 'react';

export function OnlinePill() {
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

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-xs transition ${
        online
          ? 'bg-emerald-900/40 text-emerald-100 border border-emerald-400/30'
          : 'bg-rose-950/50 text-rose-200 border border-rose-400/30'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shadow-xs ${
          online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
        }`}
      />
      <span className="hidden sm:inline font-mono">{online ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
    </span>
  );
}
