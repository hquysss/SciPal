'use client';

import { Lock } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { CSSProperties } from 'react';
import type { ProgressSummary } from './progressQueries';

// Each badge takes one of the level's supporting colors, in turn.
const BADGE_TONES = ['var(--sun)', 'var(--sky)', 'var(--coral)'];
const tone = (index: number) => ({ '--tone': BADGE_TONES[index % BADGE_TONES.length] }) as CSSProperties;

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
    <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink">{t({ en: 'Badges', vi: 'Huy hiệu' })}</h2>
        <p className="text-sm text-ink-muted">
          {t({ en: `${badges.length} unlocked`, vi: `${badges.length} huy hiệu đã mở khoá` })}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {badges.map((ub, i) => (
          <li
            key={i}
            style={tone(i)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--tone)_60%,var(--line))] bg-[color-mix(in_srgb,var(--tone)_16%,var(--surface))] p-4 text-center text-ink transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_14px_26px_-18px_var(--tone)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--tone)] text-2xl shadow-[0_6px_14px_-8px_var(--tone)]">
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
            style={tone(badges.length + i)}
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--tone)_70%,var(--edge))] bg-[color-mix(in_srgb,var(--tone)_10%,var(--surface))] p-4 text-center text-ink-muted transition duration-300 ease-out hover:-translate-y-1 hover:bg-[color-mix(in_srgb,var(--tone)_18%,var(--surface))] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--tone)_40%,var(--surface))] text-2xl opacity-80">
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
