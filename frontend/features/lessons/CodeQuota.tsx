'use client';

import { Gauge } from 'lucide-react';
import type { CodeQuota, CodeQuotaPart } from './practiceApi';

type Bilingual = { en: string; vi: string };

/** Runs left today on one counter; none when the person's own limit or the whole judge is used up. */
export const runsLeft = (part: CodeQuotaPart) => (part.site_full ? 0 : Math.max(0, part.limit - part.used));

/** The bar fills with what is left: green while there is plenty, amber near the end, red at none. */
const tone = (left: number, limit: number) => (left === 0 ? 'bg-danger' : left / Math.max(1, limit) <= 0.2 ? 'bg-warning' : 'bg-success');

function Meter({ label, part, t }: { label: Bilingual; part: CodeQuotaPart; t: (text: Bilingual) => string }) {
  const left = runsLeft(part);
  const percent = Math.round((Math.min(left, part.limit) / Math.max(1, part.limit)) * 100);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-ink">{t(label)}</span>
        <span className="font-mono text-sm font-extrabold tabular-nums text-ink">
          {left}/{part.limit}
          <span className="sr-only"> {t({ en: 'left today', vi: 'còn lại hôm nay' })}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={t(label)}
        aria-valuemin={0}
        aria-valuemax={part.limit}
        aria-valuenow={Math.min(left, part.limit)}
        className="h-2.5 overflow-hidden rounded-full bg-surface"
      >
        <div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${tone(left, part.limit)}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** How many runs the learner has left today. Hidden for a visitor (no quota to show). */
export function CodeQuotaBar({ quota, t }: { quota: CodeQuota | null; t: (text: Bilingual) => string }) {
  if (!quota) return null;
  const submitFull = quota.submit.site_full;
  const out = runsLeft(quota.submit) === 0;
  return (
    <section aria-label={t({ en: 'Runs left today', vi: 'Lượt còn lại hôm nay' })} className="flex flex-col gap-2 rounded-2xl bg-surface-sunken p-3 sm:p-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-ink">
        <Gauge aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
        {t({ en: 'Runs left today', vi: 'Lượt còn lại hôm nay' })}
      </h4>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <Meter label={{ en: 'Submits', vi: 'Nộp bài' }} part={quota.submit} t={t} />
        <Meter label={{ en: 'Trial runs', vi: 'Chạy thử' }} part={quota.run} t={t} />
      </div>
      <p className={`text-xs ${out ? 'font-bold text-danger' : 'text-ink'}`} role={out ? 'status' : undefined}>
        {submitFull
          ? t({ en: 'The judge is full for today. Try again tomorrow.', vi: 'Hôm nay hệ thống chấm bài đã đầy. Em thử lại vào ngày mai nhé.' })
          : out
            ? t({ en: 'You have used all of today’s submits. They come back at midnight.', vi: 'Em đã dùng hết lượt nộp bài hôm nay. Lượt mới có lại lúc 0 giờ.' })
            : t({ en: 'Counted per day (Vietnam time); new runs at midnight.', vi: 'Tính theo ngày (giờ Việt Nam), có lượt mới lúc 0 giờ.' })}
      </p>
    </section>
  );
}
