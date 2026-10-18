'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { setChatGrade } from '../community/chatApi';
import { getProfile } from './profileApi';

const GRADES = [10, 11, 12] as const;

/** The reader's grade (khối), kept on the account: it decides the grade room and shows on the public profile. */
export function GradeSetting() {
  const { t } = useLanguage();
  const [grade, setGrade] = useState<number | null>(null);
  const [state, setState] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');

  useEffect(() => {
    let live = true;
    void getProfile('me').then((result) => {
      if (!live) return;
      if (result.ok) setGrade(result.data.grade);
      setState(result.ok ? 'idle' : 'error');
    });
    return () => {
      live = false;
    };
  }, []);

  const choose = async (next: number) => {
    if (state === 'saving' || state === 'loading' || next === grade) return;
    setState('saving');
    const result = await setChatGrade(next);
    if (result.ok) setGrade(next);
    setState(result.ok ? 'saved' : 'error');
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface-sunken p-4" aria-labelledby="grade-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="grade-title" className="text-sm font-bold text-ink">{t({ en: 'Your grade', vi: 'Khối học của bạn' })}</h3>
          <p className="mt-1 text-sm text-ink-muted">{t({ en: 'Used for your grade chat room and shown on your profile.', vi: 'Dùng để vào phòng chat của khối và hiện trên hồ sơ của bạn.' })}</p>
        </div>
        <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-sm font-semibold text-ink-muted" aria-live="polite">
          {grade ? t({ en: 'Saved to account', vi: 'Đã lưu vào tài khoản' }) : t({ en: 'No grade selected yet', vi: 'Chưa chọn khối' })}
        </span>
      </div>
      <div role="group" aria-label={t({ en: 'Your grade', vi: 'Khối học của bạn' })} className="grid grid-cols-3 gap-2">
        {GRADES.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={grade === g}
            disabled={state === 'saving' || state === 'loading'}
            onClick={() => void choose(g)}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60 ${
              grade === g ? 'border-action bg-action text-action-ink' : 'border-edge bg-surface text-ink hover:bg-surface-sunken'
            }`}
          >
            {t({ en: `Grade ${g}`, vi: `Khối ${g}` })}
            {grade === g && <Check aria-hidden="true" className="size-4" />}
          </button>
        ))}
      </div>
      {state === 'saved' && <Alert tone="success">{t({ en: 'Saved. Your grade room is ready.', vi: 'Đã lưu. Phòng chat của khối đã sẵn sàng.' })}</Alert>}
      {state === 'error' && <Alert tone="danger">{t({ en: 'Could not save your grade. Choose it again to retry.', vi: 'Chưa lưu được khối. Hãy chọn lại để thử lại.' })}</Alert>}
    </section>
  );
}
