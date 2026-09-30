'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';

/** Whether the device is online, following the browser's online/offline events. */
export function useOnline(): boolean {
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
  return online;
}

export function OfflineBannerView({ online }: { online: boolean }) {
  const { t } = useLanguage();
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-sm font-semibold text-surface">
      <WifiOff aria-hidden="true" className="h-4 w-4 shrink-0" />
      {t({
        vi: 'Em đang offline. Bài đã lưu vẫn đọc được; Giáo sư SciPal, thi thử và thanh toán cần có mạng.',
        en: 'You are offline. Saved lessons still open; the SciPal Professor, exams and payments need a connection.',
      })}
    </div>
  );
}

/** A strip under the nav bar while the device has no connection. */
export function OfflineBanner() {
  return <OfflineBannerView online={useOnline()} />;
}
