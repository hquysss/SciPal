'use client';

import { Lock } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { ProgressSummary } from './progressQueries';

type BadgeRow = ProgressSummary['badges'][number];

const SAMPLE_LOCKED_BADGES = [
  {
    name: { en: 'Algorithm era', vi: 'Kỷ nguyên Thuật toán' },
    icon: '⚡',
    desc: { en: 'Finish 5 Informatics lessons', vi: 'Hoàn thành 5 bài học Tin học' },
  },
  {
    name: { en: 'Young mathematician', vi: 'Nhà Toán học trẻ' },
    icon: '📐',
    desc: { en: 'Answer 10 Maths questions correctly', vi: 'Giải đúng 10 câu trắc nghiệm Toán' },
  },
  {
    name: { en: 'Steady learner', vi: 'Chiến binh Bền bỉ' },
    icon: '🛡️',
    desc: { en: 'Reach a 7-day streak', vi: 'Đạt chuỗi streak 7 ngày liên tiếp' },
  },
];

export function BadgeWall({ badges }: { badges: BadgeRow[] }) {
  const { lang, t } = useLanguage();
  return (
    <section className="rounded-xl border border-line bg-surface p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink">{t({ en: 'Badges', vi: 'Bảo tàng huy hiệu danh dự' })}</h2>
        <p className="text-sm text-ink-muted">
          {t({ en: `${badges.length} unlocked`, vi: `${badges.length} huy hiệu đã mở khoá` })}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {badges.map((ub, i) => (
          <li key={i} className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-4 text-center text-ink">
            <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-sunken text-2xl">
              {ub.badges?.icon ?? '🏅'}
            </span>
            <span className="text-sm font-bold">
              {lang === 'en' ? (ub.badges?.name_en ?? ub.badges?.name_vi) : ub.badges?.name_vi}
            </span>
            <span className="rounded-md bg-success-surface px-2 py-0.5 text-sm font-semibold text-success">
              {t({ en: 'Unlocked', vi: 'Đã mở khoá' })}
            </span>
          </li>
        ))}

        {SAMPLE_LOCKED_BADGES.map((lb, i) => (
          <li
            key={i}
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-edge bg-surface-sunken p-4 text-center text-ink-muted"
          >
            <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-2xl grayscale">
              {lb.icon}
            </span>
            <span className="text-sm font-semibold">{t(lb.name)}</span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold">
              <Lock aria-hidden="true" className="h-3.5 w-3.5" />
              {t({ en: 'Locked', vi: 'Chưa mở khoá' })}
            </span>
            <span className="text-sm">{t(lb.desc)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
