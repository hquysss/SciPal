'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { ChevronDown, CircleCheck, Circle, Map as MapIcon } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { RoadmapChapter, RoadmapLesson, SubjectRoadmap } from './progressModel';

const scope = (accent: string) => ({ '--accent': accent }) as CSSProperties;

function chapterState(c: RoadmapChapter) {
  if (c.done === c.lessons.length) return 'done' as const;
  return c.lessons.some((l) => l.state === 'current') || c.done > 0 ? ('current' as const) : ('todo' as const);
}

function LessonRow({ lesson, href }: { lesson: RoadmapLesson; href: string }) {
  const { lang, t } = useLanguage();
  const title = t(lesson.title);
  const date = lesson.completedAt
    ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', { day: 'numeric', month: 'short' }).format(new Date(lesson.completedAt))
    : null;

  if (lesson.state === 'current') {
    return (
      <li>
        <Link
          href={href}
          aria-current="step"
          className="group flex items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_55%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] px-3 py-3 shadow-[0_8px_24px_-16px_var(--accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span aria-hidden="true" className="relative grid h-5 w-5 shrink-0 place-items-center">
            <span className="absolute h-full w-full rounded-full bg-accent opacity-40 motion-safe:animate-ping" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="min-w-0 flex-1 font-semibold text-ink [overflow-wrap:anywhere]">{title}</span>
          <span className="shrink-0 rounded-full border border-accent bg-[color-mix(in_srgb,var(--accent)_22%,var(--surface))] px-2.5 py-0.5 text-sm font-semibold text-ink">
            {t({ en: 'Up next', vi: 'Học tiếp' })}
          </span>
        </Link>
      </li>
    );
  }

  const done = lesson.state === 'done';
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
      >
        {done ? (
          <CircleCheck aria-label={t({ en: 'Completed', vi: 'Đã hoàn thành' })} className="h-5 w-5 shrink-0 text-success" />
        ) : (
          <Circle aria-label={t({ en: 'Not started', vi: 'Chưa học' })} className="h-5 w-5 shrink-0 text-ink-muted" />
        )}
        <span className={`min-w-0 flex-1 [overflow-wrap:anywhere] ${done ? 'text-ink-muted' : 'text-ink'}`}>{title}</span>
        {date && <span className="shrink-0 text-sm tabular-nums text-ink-muted">{date}</span>}
      </Link>
    </li>
  );
}

const TAG = {
  done: { cls: 'bg-success-surface text-success', label: { en: 'Completed', vi: 'Hoàn thành' } },
  current: { cls: 'bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface))] text-ink', label: { en: 'In progress', vi: 'Đang học' } },
  todo: { cls: 'bg-surface-sunken text-ink-muted', label: { en: 'Not started', vi: 'Chưa bắt đầu' } },
};

function Chapter({ chapter, number, subjectSlug }: { chapter: RoadmapChapter; number: number; subjectSlug: string }) {
  const { t } = useLanguage();
  const state = chapterState(chapter);
  const percent = chapter.lessons.length ? Math.round((chapter.done / chapter.lessons.length) * 100) : 0;
  return (
    <li className="relative pl-10">
      {/* Spine: solid through finished chapters, dashed ahead. */}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-[15px] top-10 border-l-2 ${state === 'done' ? 'border-success' : 'border-dashed border-edge'}`}
      />
      <span
        aria-hidden="true"
        className={`absolute left-0 top-3 grid h-8 w-8 place-items-center rounded-full text-sm font-bold tabular-nums ${
          state === 'done' ? 'bg-success text-surface' : state === 'current' ? 'border-2 border-accent bg-[color-mix(in_srgb,var(--accent)_22%,var(--surface))] text-ink ring-4 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]' : 'border-2 border-edge bg-surface text-ink-muted'
        }`}
      >
        {number}
      </span>
      <details open={state === 'current'} className="group mb-4 rounded-2xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-ink [overflow-wrap:anywhere]">{t(chapter.title)}</span>
              <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${TAG[state].cls}`}>{t(TAG[state].label)}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
              </span>
              <span className="shrink-0 text-sm tabular-nums text-ink-muted">
                {t({ en: `Grade ${chapter.grade} · ${chapter.done}/${chapter.lessons.length}`, vi: `Lớp ${chapter.grade} · ${chapter.done}/${chapter.lessons.length} bài` })}
              </span>
            </div>
          </div>
          <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <ol className="flex flex-col gap-1 border-t border-line p-2">
          {chapter.lessons.map((l) => <LessonRow key={l.id} lesson={l} href={`/${subjectSlug}/${l.slug}`} />)}
        </ol>
      </details>
    </li>
  );
}

export function Roadmap({ roadmaps }: { roadmaps: SubjectRoadmap[] | null }) {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const r = roadmaps?.[Math.min(active, (roadmaps?.length ?? 1) - 1)];

  return (
    <section aria-labelledby="roadmap-title" className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-sunken text-ink"><MapIcon className="h-5 w-5" /></span>
        <div>
          <h2 id="roadmap-title" className="text-lg font-bold text-ink">{t({ en: 'Learning roadmap', vi: 'Lộ trình học' })}</h2>
          <p className="text-sm text-ink-muted">{t({ en: 'Chapters in the order of the curriculum', vi: 'Các chủ đề theo thứ tự chương trình' })}</p>
        </div>
      </div>

      {!roadmaps ? (
        <p role="status" className="rounded-2xl bg-surface-sunken px-4 py-5 text-sm text-ink-muted">
          {t({ en: 'The roadmap could not be loaded. Reload to try again.', vi: 'Chưa tải được lộ trình. Tải lại trang để thử lại.' })}
        </p>
      ) : !r ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-edge p-5">
          <p className="text-sm text-ink-muted">
            {t({ en: 'Finish your first lesson and its subject roadmap will appear here.', vi: 'Hoàn thành bài đầu tiên, lộ trình của môn đó sẽ hiện ở đây.' })}
          </p>
          <Link href="/subjects" className="inline-flex min-h-11 items-center rounded-xl text-sm font-semibold text-ink underline underline-offset-4 hover:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            {t({ en: 'Browse subjects', vi: 'Xem các môn học' })}
          </Link>
        </div>
      ) : (
        <>
          {roadmaps.length > 1 && (
            <div role="group" aria-label={t({ en: 'Subject', vi: 'Môn học' })} className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {roadmaps.map((m, i) => (
                <button
                  key={m.subject.id}
                  type="button"
                  aria-pressed={m === r}
                  onClick={() => setActive(i)}
                  data-subject-scope=""
                  style={scope(m.subject.accent)}
                  className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none ${
                    m === r ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] text-ink' : 'border-line text-ink-muted hover:text-ink'
                  }`}
                >
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
                  {t(m.subject.name)}
                  <span className="tabular-nums text-ink-muted">{m.total ? Math.round((m.done / m.total) * 100) : 0}%</span>
                </button>
              ))}
            </div>
          )}
          <div key={r.subject.id} data-subject-scope="" style={scope(r.subject.accent)} className="motion-safe:animate-[page-rise_320ms_cubic-bezier(0.22,1,0.36,1)]">
            <p className="mb-4 text-sm text-ink-muted">
              {t({ en: `${t(r.subject.name)}: ${r.done} of ${r.total} lessons done`, vi: `${t(r.subject.name)}: đã học ${r.done}/${r.total} bài` })}
            </p>
            <ol>
              {r.chapters.map((c, i) => <Chapter key={c.id} chapter={c} number={i + 1} subjectSlug={r.subject.slug} />)}
            </ol>
          </div>
        </>
      )}
    </section>
  );
}
