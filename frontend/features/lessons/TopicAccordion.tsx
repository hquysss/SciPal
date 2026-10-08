'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';

interface Lesson {
  id: string;
  slug: string;
  title_en: string;
  title_vi: string;
  source?: string | null;
  sort_order: number;
}

interface Topic {
  id: string;
  name_en: string;
  name_vi: string;
  lessons: Lesson[];
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
                  {topicIdx + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-widest text-action">
                    {t({ en: 'Topic', vi: 'Chủ đề' })} {topicIdx + 1}
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
                        className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line text-xs font-semibold text-ink-muted">{lessonIdx + 1}</span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-ink">{lang === 'en' ? lesson.title_en : lesson.title_vi}</span>
                          <span className="block text-sm text-ink-muted">{lang === 'en' ? lesson.title_vi : lesson.title_en}</span>
                          {lesson.source && (
                            <span className="block text-xs italic text-ink-muted">
                              {lang === 'en' ? 'Source' : 'Nguồn'}: {lesson.source}
                            </span>
                          )}
                        </span>
                        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-action" />
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
