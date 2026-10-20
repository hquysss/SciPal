'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CloudDownload } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';
import { useOnline } from '@/components/pwa/OfflineBanner';
import { saveExamForOffline } from './offlineExam';

type Bilingual = { vi: string; en: string };
type State = { kind: 'idle' } | { kind: 'saving' } | { kind: 'done' } | { kind: 'error'; error: Bilingual };

/**
 * "Tải đề để thi offline" on the page before an exam. Saving starts the graded attempt (it is counted
 * now), so the button says so. Hidden where the browser cannot keep pages.
 */
export function SaveExamOffline({ blueprintId, saved, onSaved }: { blueprintId: string; saved: boolean; onSaved: () => void }) {
  const { t } = useLanguage();
  const online = useOnline();
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<State>({ kind: 'idle' });

  useEffect(() => {
    setSupported('caches' in window && 'serviceWorker' in navigator);
  }, []);
  if (!supported) return null;

  if (saved || state.kind === 'done') {
    return (
      <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-action" />
        {t({ vi: 'Đã lưu đề. Bạn có thể thi khi không có mạng; lượt thi đã được tính.', en: 'Exam saved. You can take it without a connection; the attempt is counted.' })}
      </p>
    );
  }

  const save = async () => {
    setState({ kind: 'saving' });
    const res = await saveExamForOffline(blueprintId);
    if (res.ok) {
      setState({ kind: 'done' });
      onSaved();
    } else setState({ kind: 'error', error: res.error });
  };
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={() => void save()} disabled={!online || state.kind === 'saving'} aria-busy={state.kind === 'saving'} className={buttonVariants({ variant: 'outline' })}>
        <CloudDownload aria-hidden="true" />
        {state.kind === 'saving' ? t({ vi: 'Đang lưu đề…', en: 'Saving the exam…' }) : t({ vi: 'Tải đề để thi offline', en: 'Save this exam for offline' })}
      </button>
      <p className="text-sm text-ink-muted">{t({ vi: 'Tải đề sẽ tính một lượt thi ngay.', en: 'Saving the exam uses one graded attempt now.' })}</p>
      {state.kind === 'error' && <p role="alert" className="text-sm text-danger">{t(state.error)}</p>}
    </div>
  );
}
