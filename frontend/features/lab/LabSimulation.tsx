'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { ArrowRight, BookOpen, FlaskConical } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { SubjectProvider } from '@scipal/ui';
import { defaultSimulationConfig, type BuiltInSimulationKind } from '@scipal/types';
import { simulationModules } from '@/features/simulations/registry';
import type { SimulationViewProps } from '@/features/simulations/types';
import { LAB_ITEMS, LAB_SUBJECTS, type LabItem } from './catalog';
import { LAB_ICONS } from './LabIndex';
import type { LabUsage } from './labQuery';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** One simulation, free to play with from its default settings, and the lessons that teach with it. */
export function LabSimulation({ item, usages }: { item: LabItem; usages: LabUsage[] | null }) {
  const { t, lang } = useLanguage();
  const sim = simulationModules[item.kind];
  const Renderer = sim.Renderer as ComponentType<SimulationViewProps<BuiltInSimulationKind>>;
  const subject = LAB_SUBJECTS.find((s) => s.slug === item.subject)!;
  const Icon = LAB_ICONS[item.kind] ?? FlaskConical;
  const others = LAB_ITEMS.filter((i) => i.subject === item.subject && i.kind !== item.kind);

  return (
    <SubjectProvider slug={item.subject}>
      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <Link href="/lab" className={`rounded underline-offset-4 hover:text-ink hover:underline ${FOCUS}`}>
            {t({ en: 'Lab', vi: 'Phòng thí nghiệm' })}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{t(subject.name)}</span>
        </nav>

        <header className="mb-6 flex items-start gap-4">
          <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-[color-mix(in_oklch,var(--accent)_14%,transparent)] text-[var(--accent)]">
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t(item.name)}</h1>
            <p className="mt-1 max-w-prose text-ink-muted">
              {t(item.blurb)} <span className="whitespace-nowrap">· {t(item.grades)}</span>
            </p>
          </div>
        </header>

        <Renderer config={defaultSimulationConfig(item.kind)} lang={lang} />

        <section aria-labelledby="lab-lessons" className="mt-10">
          <h2 id="lab-lessons" className="mb-3 text-lg font-bold text-ink">
            {t({ en: 'Learn it in a lesson', vi: 'Học trong bài' })}
          </h2>
          {usages === null ? (
            <p className="text-sm text-ink-muted">{t({ en: 'Could not load the lessons right now.', vi: 'Chưa tải được danh sách bài học.' })}</p>
          ) : usages.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-muted">
              {t({ en: 'No lesson uses this simulation yet. Teachers can add it to a lesson in Studio.', vi: 'Chưa có bài học nào dùng mô phỏng này. Giáo viên có thể thêm vào bài trong Studio.' })}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
              {usages.map((u, i) => (
                <li key={`${u.href}-${i}`}>
                  <Link href={u.href} className={`flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-sunken ${FOCUS}`}>
                    <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{t(u.lesson)}</span>
                      {t(u.heading) && <span className="block truncate text-sm text-ink-muted">{t(u.heading)}</span>}
                    </span>
                    <span className="shrink-0 text-sm text-ink-muted">{t({ en: `Grade ${u.grade}`, vi: `Lớp ${u.grade}` })}</span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {others.length > 0 && (
          <section aria-labelledby="lab-more" className="mt-10">
            <h2 id="lab-more" className="mb-3 text-lg font-bold text-ink">
              {t({ en: `More in ${subject.name.en}`, vi: `Thêm ở môn ${subject.name.vi}` })}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {others.map((o) => {
                const OtherIcon = LAB_ICONS[o.kind] ?? FlaskConical;
                return (
                  <li key={o.kind}>
                    <Link href={`/lab/${o.kind}`} className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-sunken ${FOCUS}`}>
                      <OtherIcon aria-hidden="true" className="h-4 w-4 text-[var(--accent)]" />
                      {t(o.name)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </SubjectProvider>
  );
}
