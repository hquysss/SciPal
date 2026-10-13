'use client';

import { useId } from 'react';
import { useLanguage } from '@scipal/hooks';

/** Whether the lesson tags its subject's core terms by itself; off for a lesson where the tags get in the way. */
export function AutoTermsSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  const { t } = useLanguage();
  const hintId = useId();
  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-60"
        />
        {t({ en: 'Tag core terms automatically', vi: 'Tự đánh dấu thuật ngữ cốt lõi trong bài' })}
      </label>
      <p id={hintId} className="pl-8 text-xs text-ink-muted">
        {t({
          en: 'The first use of each core term of the subject becomes a tap-to-open card. Your own tags stay either way.',
          vi: 'Lần dùng đầu của mỗi thuật ngữ cốt lõi của môn thành thẻ chạm để xem. Thẻ bạn gắn tay vẫn giữ dù bật hay tắt.',
        })}
      </p>
    </div>
  );
}
