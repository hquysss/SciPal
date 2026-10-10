'use client';

import Link from 'next/link';
import type { ComponentType, CSSProperties } from 'react';
import { ArrowRight, BookOpen, BookOpenCheck, Flame, GraduationCap, Library, Sparkles } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';

const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const tone = (color: string) => ({ '--tone': color }) as CSSProperties;

export interface HeroStats {
  percent: number;
  done: number;
  total: number;
  streak: number;
  lessons: number;
  examsPassed: number | null;
  examsTaken: number;
  xp: number;
  level: number;
}

/** Ring: a quiet ink track, a sun→coral arc, and the number in the middle. Empty = dashed track. */
function Ring({ percent, empty, children, label }: { percent: number; empty: boolean; children: React.ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} className="relative grid h-44 w-44 shrink-0 place-items-center sm:h-48 sm:w-48">
      <span aria-hidden="true" className="absolute inset-4 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--sun)_22%,transparent),transparent_70%)] blur-xl" />
      <svg aria-hidden="true" viewBox="0 0 128 128" className="absolute inset-0 h-full w-full -rotate-90">
        <defs>
          <linearGradient id="hero-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--sun)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--coral)' }} />
          </linearGradient>
        </defs>
        <circle
          cx="64" cy="64" r={RING_R} fill="none" strokeWidth="9"
          strokeDasharray={empty ? '2 9' : undefined}
          strokeLinecap="round"
          style={{ stroke: 'color-mix(in srgb, var(--ink) 14%, transparent)' }}
        />
        {!empty && (
          <circle
            cx="64" cy="64" r={RING_R} fill="none" strokeWidth="9" strokeLinecap="round" stroke="url(#hero-ring)"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - Math.max(percent, 1.5) / 100)}
            className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
          />
        )}
      </svg>
      <div aria-hidden="true" className="relative text-center leading-none">{children}</div>
    </div>
  );
}

function Stat({ icon: Icon, color, value, sub, label }: { icon: ComponentType<{ className?: string }>; color: string; value: string; sub?: string; label: string }) {
  return (
    <div style={tone(color)} className="flex flex-col items-start gap-2 bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] px-4 py-3.5 sm:flex-row sm:items-center sm:gap-3">
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--tone)_22%,var(--surface))] text-ink">
        <Icon className="h-5 w-5" />
      </span>
      <dl className="flex min-w-0 flex-col-reverse">
        <dt className="text-sm text-ink-muted">{label}</dt>
        <dd className="text-xl font-extrabold leading-tight tabular-nums text-ink">
          {value}
          {sub && <span className="ml-1 text-sm font-semibold text-ink-muted">{sub}</span>}
        </dd>
      </dl>
    </div>
  );
}

const STEPS = [
  { icon: Library, color: 'var(--sky)', title: { en: 'Pick a subject', vi: 'Chọn một môn' }, body: { en: 'Informatics is the most complete.', vi: 'Tin học có nhiều bài nhất.' } },
  { icon: BookOpen, color: 'var(--sun)', title: { en: 'Finish a lesson', vi: 'Học xong một bài' }, body: { en: 'Your roadmap appears here.', vi: 'Lộ trình sẽ hiện ở đây.' } },
  { icon: Flame, color: 'var(--coral)', title: { en: 'Come back tomorrow', vi: 'Quay lại ngày mai' }, body: { en: 'Two days make a streak.', vi: 'Hai ngày là có chuỗi.' } },
];

export function ProgressHero({ stats }: { stats: HeroStats }) {
  const { t } = useLanguage();
  const fresh = stats.total === 0 && stats.lessons === 0 && stats.xp === 0;

  return (
    <header className="relative isolate overflow-hidden rounded-3xl border border-line bg-surface">
      {/* Atmosphere: two soft colour fields and a faint dot grid, all behind content. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(55%_85%_at_100%_0%,color-mix(in_srgb,var(--sun)_26%,transparent),transparent),radial-gradient(50%_80%_at_0%_100%,color-mix(in_srgb,var(--sky)_20%,transparent),transparent)]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(color-mix(in_srgb,var(--ink)_14%,transparent)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />

      <div className="flex flex-col-reverse items-center gap-6 p-6 sm:p-8 md:flex-row md:items-center md:gap-10">
        <div className="w-full min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] px-3 py-1 text-sm font-semibold text-ink-muted">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {fresh ? t({ en: 'Level 1 · ready to start', vi: 'Cấp 1 · sẵn sàng bắt đầu' }) : t({ en: `Level ${stats.level} · ${stats.xp.toLocaleString()} XP`, vi: `Cấp ${stats.level} · ${stats.xp.toLocaleString()} XP` })}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {t({ en: 'Learning progress', vi: 'Tiến trình học tập' })}
          </h1>
          <p className="mt-3 max-w-xl text-base text-ink-muted">
            {fresh
              ? t({ en: 'Nothing here yet. Three small steps and this page starts filling up with your journey.', vi: 'Chưa có gì ở đây. Ba bước nhỏ là trang này bắt đầu ghi lại hành trình của bạn.' })
              : t({ en: `You have finished ${stats.done} of ${stats.total} lessons in the subjects you study.`, vi: `Bạn đã học ${stats.done}/${stats.total} bài trong các môn đang theo.` })}
          </p>

          {fresh ? (
            <>
              <ol className="mt-6 grid gap-2 sm:grid-cols-3">
                {STEPS.map((s, i) => (
                  <li key={i} style={tone(s.color)} className="flex items-start gap-3 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] p-3.5">
                    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--tone)_24%,var(--surface))] text-ink">
                      <s.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">
                        <span className="text-ink-muted">{i + 1}. </span>{t(s.title)}
                      </span>
                      <span className="block text-sm text-ink-muted">{t(s.body)}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Link
                href="/subjects"
                className={`group mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-action px-6 text-base font-semibold text-action-ink shadow-[0_10px_24px_-14px_var(--action)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${FOCUS}`}
              >
                {t({ en: 'Choose a subject', vi: 'Chọn môn học' })}
                <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
              <Stat icon={Flame} color="var(--coral)" value={String(stats.streak)} label={t({ en: 'Day streak', vi: 'Ngày liên tiếp' })} />
              <Stat icon={BookOpenCheck} color="var(--sky)" value={String(stats.lessons)} label={t({ en: 'Lessons done', vi: 'Bài đã học' })} />
              <Stat
                icon={GraduationCap}
                color="var(--success)"
                value={stats.examsPassed == null ? '—' : String(stats.examsPassed)}
                sub={stats.examsTaken ? `/${stats.examsTaken}` : undefined}
                label={t({ en: 'Exams passed', vi: 'Bài thi đạt' })}
              />
              <Stat icon={Sparkles} color="var(--sun)" value={stats.xp.toLocaleString()} label="XP" />
            </div>
          )}
        </div>

        <Ring
          percent={stats.percent}
          empty={fresh}
          label={fresh
            ? t({ en: 'No lessons completed yet', vi: 'Chưa hoàn thành bài nào' })
            : t({ en: `${stats.percent}% complete, ${stats.done} of ${stats.total} lessons`, vi: `Hoàn thành ${stats.percent}%, ${stats.done}/${stats.total} bài` })}
        >
          {fresh ? (
            <>
              <BookOpen className="mx-auto h-8 w-8 text-ink-muted" />
              <div className="mt-2 text-sm font-semibold text-ink-muted">{t({ en: 'Your first lesson', vi: 'Bài đầu tiên' })}</div>
            </>
          ) : (
            <>
              <div className="text-5xl font-extrabold tracking-tight tabular-nums text-ink">{stats.percent}<span className="text-2xl">%</span></div>
              <div className="mt-2 text-sm font-semibold text-ink-muted">{t({ en: `${stats.done}/${stats.total} lessons`, vi: `${stats.done}/${stats.total} bài` })}</div>
            </>
          )}
        </Ring>
      </div>
    </header>
  );
}
