'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CloudDownload } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';
import { useOnline } from '@/components/pwa/OfflineBanner';
import { saveExamsOffline } from './offlineExam';

type State = { kind: 'idle' } | { kind: 'saving'; done: number; total: number } | { kind: 'done'; saved: number; failed: number };

/**
 * On the exam list: keeps every listed exam on this device to take without a connection. Saving uses
 * no graded attempt; it is counted when the finished exam is sent. Hidden where it cannot work.
 */
export function SaveExamsButton({ blueprintIds }: { blueprintIds: string[] }) {
  const { t } = useLanguage();
  const online = useOnline();
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<State>({ kind: 'idle' });

  useEffect(() => {
    setSupported('caches' in window && 'serviceWorker' in navigator);
  }, []);
  if (!supported || blueprintIds.length === 0) return null;

  const save = async () => {
    setState({ kind: 'saving', done: 0, total: blueprintIds.length });
    const result = await saveExamsOffline(blueprintIds, (done, total) => setState({ kind: 'saving', done, total }));
    setState({ kind: 'done', ...result });
  };

  if (state.kind === 'done') {
    return (
      <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-action" />
        {state.failed === 0
          ? t({ vi: `Đã lưu ${state.saved} đề để thi offline. Lượt thi tính khi bạn nộp bài.`, en: `${state.saved} exams saved for offline. An attempt is counted when you submit.` })
          : t({ vi: `Đã lưu ${state.saved} đề; ${state.failed} đề chưa lưu được, thử lại khi mạng ổn.`, en: `${state.saved} exams saved; ${state.failed} could not be saved, try again on a steady connection.` })}
      </p>
    );
  }
  const saving = state.kind === 'saving';
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={() => void save()} disabled={saving || !online} aria-busy={saving} className={buttonVariants({ variant: 'outline' })}>
        <CloudDownload aria-hidden="true" />
        {saving
          ? t({ vi: `Đang lưu ${state.done}/${state.total}…`, en: `Saving ${state.done}/${state.total}…` })
          : t({ vi: `Lưu ${blueprintIds.length} đề để thi offline`, en: `Save ${blueprintIds.length} exams for offline` })}
      </button>
      <p className="text-sm text-ink-muted">{t({ vi: 'Tải đề không trừ lượt thi; lượt tính khi bạn nộp bài.', en: 'Saving does not use an attempt; it is counted when you submit.' })}</p>
    </div>
  );
}
