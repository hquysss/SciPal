'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CloudDownload } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';
import { useOnline } from '@/components/pwa/OfflineBanner';
import { savePagesOffline } from '@/lib/pwa/saveOffline';

export type SaveState = { kind: 'idle' } | { kind: 'saving'; done: number; total: number } | { kind: 'done'; saved: number; failed: number };

export function SaveOfflineView({ state, count, online, onSave }: { state: SaveState; count: number; online: boolean; onSave: () => void }) {
  const { t } = useLanguage();
  if (state.kind === 'done') {
    return (
      <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-action" />
        {state.failed === 0
          ? t({ vi: `Đã lưu ${state.saved} bài để học offline.`, en: `${state.saved} lessons saved for offline.` })
          : t({ vi: `Đã lưu ${state.saved} bài; ${state.failed} bài chưa lưu được, thử lại khi mạng ổn.`, en: `${state.saved} lessons saved; ${state.failed} could not be saved, try again on a steady connection.` })}
      </p>
    );
  }
  const saving = state.kind === 'saving';
  return (
    <button type="button" onClick={onSave} disabled={saving || !online} aria-busy={saving} className={buttonVariants({ variant: 'outline', className: 'self-start' })}>
      <CloudDownload aria-hidden="true" />
      {saving
        ? t({ vi: `Đang lưu ${state.done}/${state.total}…`, en: `Saving ${state.done}/${state.total}…` })
        : t({ vi: `Tải ${count} bài để học offline`, en: `Save ${count} lessons for offline` })}
    </button>
  );
}

/** On a subject page: keeps every lesson of the subject on this device. Hidden where it cannot work. */
export function SaveOfflineButton({ urls }: { urls: string[] }) {
  const online = useOnline();
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<SaveState>({ kind: 'idle' });

  useEffect(() => {
    setSupported('caches' in window && 'serviceWorker' in navigator);
  }, []);
  if (!supported || urls.length === 0) return null;

  const save = async () => {
    setState({ kind: 'saving', done: 0, total: urls.length });
    const result = await savePagesOffline(urls, (done, total) => setState({ kind: 'saving', done, total }));
    setState({ kind: 'done', ...result });
  };
  return <SaveOfflineView state={state} count={urls.length} online={online} onSave={() => void save()} />;
}
