'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { embedUrl } from '@scipal/types';
import { pick, type Lang } from './types';

/** An approved PhET / GeoGebra / Desmos page in a sandboxed frame, with a link out. */
export function EmbedRenderer({ url, title, lang }: { url: string | undefined; title: string; lang: Lang }) {
  const t = pick(lang);
  const safe = url ? embedUrl(url) : null;
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!safe) {
    return (
      <p role="note" className="rounded-md border border-dashed border-edge bg-surface-sunken p-6 text-center text-sm text-ink-muted">
        {t({ en: 'This link is not allowed to be embedded.', vi: 'Link này không được phép nhúng.' })}
      </p>
    );
  }

  const link = (
    <a href={safe.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-action underline-offset-4 hover:underline">
      {t({ en: 'Open in a new tab', vi: 'Mở trong thẻ mới' })}
      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
    </a>
  );

  if (!online) {
    return (
      <div role="note" className="flex flex-col items-center gap-2 rounded-md border border-dashed border-edge bg-surface-sunken p-6 text-center text-sm text-ink-muted">
        {t({ en: 'This simulation needs an internet connection.', vi: 'Mô phỏng này cần kết nối mạng.' })}
        {link}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-surface-sunken">
        <iframe
          src={safe.href}
          title={title}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          allow="fullscreen"
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div className="self-end">{link}</div>
    </div>
  );
}
