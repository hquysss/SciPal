'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowDownUp, ArrowRight, Axis3d, Box, ChartSpline, CircleDot, Dices, FlaskConical, Orbit, Rocket, Zap, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { SubjectProvider } from '@scipal/ui';
import type { BuiltInSimulationKind } from '@scipal/types';
import { AddEmbedForm, SubjectEmbeds, useLabEmbeds } from './LabEmbeds';
import { LAB_ITEMS, LAB_SUBJECTS, type LabSubject } from './catalog';

export const LAB_ICONS: Partial<Record<BuiltInSimulationKind, LucideIcon>> = {
  'function-graph': ChartSpline,
  'unit-circle': CircleDot,
  'graph-3d': Axis3d,
  'solid-3d': Box,
  probability: Dices,
  motion: Rocket,
  pendulum: Orbit,
  'ohm-circuit': Zap,
  titration: FlaskConical,
  'algorithm-sim': ArrowDownUp,
};

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** The Lab's front page: every simulation by subject, each with how many lessons use it. */
export function LabIndex({ counts }: { counts: Record<string, number> | null }) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<LabSubject | 'all'>('all');
  const subjects = LAB_SUBJECTS.filter((s) => filter === 'all' || s.slug === filter);
  const outside = useLabEmbeds();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm">
          <Link href="/" className={`rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline ${FOCUS}`}>
            {t({ en: 'Home', vi: 'Trang chủ' })}
          </Link>
        </nav>
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">{t({ en: 'Lab', vi: 'Phòng thí nghiệm' })}</h1>
        <p className="mt-2 max-w-prose text-base text-ink-muted">
          {t({
            en: 'Every simulation and experiment of Mathematics, Physics, Chemistry and Informatics. Open one and try it freely, then go to the lessons that use it.',
            vi: 'Mọi mô phỏng, thí nghiệm của Toán, Vật lí, Hoá học và Tin học. Mở ra thử thoải mái, rồi vào các bài học có dùng nó.',
          })}
        </p>
      </header>

      <div role="group" aria-label={t({ en: 'Subject', vi: 'Môn học' })} className="mb-8 flex flex-wrap gap-2">
        {[{ slug: 'all' as const, name: { en: 'All', vi: 'Tất cả' } }, ...LAB_SUBJECTS].map((s) => {
          const active = filter === s.slug;
          const size =
            (s.slug === 'all' ? LAB_ITEMS.length : LAB_ITEMS.filter((i) => i.subject === s.slug).length) +
            (s.slug === 'all' ? outside.embeds.length : outside.embeds.filter((e) => e.subject === s.slug).length);
          return (
            <button
              key={s.slug}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(s.slug)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${FOCUS} ${
                active ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink hover:bg-surface-sunken'
              }`}
            >
              {t(s.name)}
              <span className={`tabular-nums ${active ? 'opacity-80' : 'text-ink-muted'}`}>{size}</span>
            </button>
          );
        })}
      </div>

      <AddEmbedForm onAdd={outside.add} defaultSubject={filter === 'all' ? 'math' : filter} />

      <div className="flex flex-col gap-10">
        {subjects.map((subject) => {
          const items = LAB_ITEMS.filter((i) => i.subject === subject.slug);
          return (
            <SubjectProvider key={subject.slug} slug={subject.slug}>
              <section aria-labelledby={`lab-${subject.slug}`}>
                <h2 id={`lab-${subject.slug}`} className="mb-4 flex items-center gap-3 text-xl font-bold text-ink">
                  <span aria-hidden="true" className="h-5 w-1.5 rounded-full bg-[var(--accent)]" />
                  {t(subject.name)}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => {
                    const Icon = LAB_ICONS[item.kind] ?? FlaskConical;
                    const used = counts?.[item.kind] ?? 0;
                    return (
                      <li key={item.kind}>
                        <Link
                          href={`/lab/${item.kind}`}
                          className={`group flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-[var(--accent)] ${FOCUS}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[color-mix(in_oklch,var(--accent)_14%,transparent)] text-[var(--accent)]">
                              <Icon className="h-6 w-6" />
                            </span>
                            <span className="text-xs font-medium text-ink-muted">{t(item.grades)}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-ink">{t(item.name)}</h3>
                            <p className="mt-1 text-sm text-ink-muted">{t(item.blurb)}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-ink-muted">
                              {counts === null
                                ? ''
                                : used > 0
                                  ? t({ en: `In ${used} lesson${used > 1 ? 's' : ''}`, vi: `Có trong ${used} bài học` })
                                  : t({ en: 'Not in a lesson yet', vi: 'Chưa có trong bài học' })}
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[var(--accent)]">
                              {t({ en: 'Try it', vi: 'Thử ngay' })}
                              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <SubjectEmbeds embeds={outside.embeds.filter((e) => e.subject === subject.slug)} onRemove={outside.remove} />
              </section>
            </SubjectProvider>
          );
        })}
      </div>
    </main>
  );
}
