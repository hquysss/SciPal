'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Code2, Dumbbell, FlaskConical, Flame, PlayCircle, type LucideIcon } from 'lucide-react';
import type { LessonTag } from './groupTopics';
import { useLanguage } from '@scipal/hooks';

interface Lesson {
  id: string;
  slug: string;
  title_en: string;
  title_vi: string;
  source?: string | null;
  sort_order: number;
  tags?: LessonTag[];
}

// Solid chips: each colour is mixed toward --ink, so the text (--surface) reads in light and dark alike.
const TAG_LOOK: Record<LessonTag, { label: { en: string; vi: string }; icon: LucideIcon; tone: string }> = {
  hot: { label: { en: 'Hot', vi: 'Hot' }, icon: Flame, tone: 'bg-[color-mix(in_srgb,var(--warning)_70%,var(--ink))] text-surface' },
  sim: { label: { en: 'Simulation', vi: 'Mô phỏng' }, icon: FlaskConical, tone: 'bg-[color-mix(in_srgb,var(--action)_70%,var(--ink))] text-surface' },
  video: { label: { en: 'Video', vi: 'Video' }, icon: PlayCircle, tone: 'bg-ink text-surface' },
  practice: { label: { en: 'Practice', vi: 'Luyện tập' }, icon: Dumbbell, tone: 'bg-[color-mix(in_srgb,var(--success)_70%,var(--ink))] text-surface' },
  code: { label: { en: 'Code', vi: 'Code' }, icon: Code2, tone: 'bg-ink text-surface' },
};

function LessonTags({ tags, t }: { tags: LessonTag[]; t: (text: { en: string; vi: string }) => string }) {
  return (
    <span className="mt-1 flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const { label, icon: Icon, tone } = TAG_LOOK[tag];
        return (
          <span key={tag} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold leading-4 ${tone}`}>
            <Icon aria-hidden="true" className="h-3 w-3" />
            {t(label)}
          </span>
        );
      })}
    </span>
  );
}

interface Topic {
  id: string;
  name_en: string;
  name_vi: string;
  sort_order?: number;
  lessons: Lesson[];
}

function lessonDisplayNumber(lesson: Lesson, fallbackIndex: number): number {
  const match = lesson.title_vi.match(/^(?:Bài|Lesson)\s*(\d+)/i) ?? lesson.title_en.match(/^(?:Bài|Lesson)\s*(\d+)/i);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  if (lesson.sort_order && lesson.sort_order > 0) return lesson.sort_order;
  return fallbackIndex;
}

export function cleanLessonTitle(title: string): string {
  if (!title) return '';
  return title.replace(/^(?:(?:Bài|Lesson)\s*\d+|\d+)[\s.:-]+\s*/i, '').trim();
}

/**
 * Topics are chapters: a tinted header with an accent edge and a "Topic n" label. They start closed
 * and unfold smoothly (grid rows 0fr to 1fr), the lessons inside rising in one after another. The
 * lessons are lighter rows hanging off a guide line, so a chapter never reads as just another lesson.
 */
export function TopicAccordion({ topics, subjectSlug }: { topics: Topic[]; subjectSlug: string }) {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {topics.map((topic, topicIdx) => {
        const isOpen = open === topic.id;
        const panelId = `topic-${topic.id}`;
        const topicNumber = topic.sort_order && topic.sort_order > 0 ? topic.sort_order : topicIdx + 1;
        return (
          <section key={topic.id} className="overflow-hidden rounded-xl border border-line bg-surface">
            <h3>
              <button
                type="button"
                className={`flex min-h-11 w-full items-center gap-4 border-l-4 border-action bg-surface-sunken px-5 py-4 text-left transition-colors hover:bg-line focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${isOpen ? 'border-b border-b-line' : ''}`}
                onClick={() => setOpen(isOpen ? null : topic.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-action text-sm font-bold text-action-ink">
                  {topicNumber}
                </span>
                <span className="flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-widest text-action">
                    {t({ en: 'Topic', vi: 'Chủ đề' })} {topicNumber}
                  </span>
                  <span className="block text-lg font-bold leading-snug text-ink">{lang === 'en' ? topic.name_en : topic.name_vi}</span>
                  <span className="block text-sm text-ink-muted">
                    {t({
                      en: `${topic.lessons.length} ${topic.lessons.length === 1 ? 'lesson' : 'lessons'}`,
                      vi: `${topic.lessons.length} bài học`,
                    })}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-5 w-5 text-ink-muted transition-transform duration-300 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              inert={!isOpen}
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="min-h-0 overflow-hidden">
                <ol className="mx-5 my-3 flex flex-col border-l-2 border-line pl-3">
                  {topic.lessons.map((lesson, lessonIdx) => (
                    <li
                      key={lesson.id}
                      style={{ transitionDelay: isOpen ? `${120 + lessonIdx * 45}ms` : '0ms' }}
                      className={`transition-[opacity,translate] duration-300 motion-reduce:transition-none ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
                    >
                      <Link
                        href={`/${subjectSlug}/${lesson.slug}`}
                        className="group flex min-h-12 items-center gap-3.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-action/30 bg-surface text-xs font-semibold tabular-nums text-ink transition-colors group-hover:border-action/60">
                          {lessonDisplayNumber(lesson, lessonIdx + 1)}
                        </span>
                        <span className="flex flex-1 flex-col justify-center">
                          <span className="block text-sm font-semibold leading-tight text-ink">
                            {cleanLessonTitle(lang === 'en' ? lesson.title_en : lesson.title_vi)}
                          </span>
                          <span className="block text-xs leading-tight text-ink-muted">
                            {cleanLessonTitle(lang === 'en' ? lesson.title_vi : lesson.title_en)}
                          </span>
                          {!!lesson.tags?.length && <LessonTags tags={lesson.tags} t={t} />}
                          {lesson.source && (
                            <span className="mt-0.5 block text-xs italic text-ink-muted">
                              {lang === 'en' ? 'Source' : 'Nguồn'}: {lesson.source}
                            </span>
                          )}
                        </span>
                        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-action transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
