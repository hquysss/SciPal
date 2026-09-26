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
  sort_order: number;
}

interface Topic {
  id: string;
  name_en: string;
  name_vi: string;
  lessons: Lesson[];
}

export function TopicAccordion({ topics, subjectSlug }: { topics: Topic[]; subjectSlug: string }) {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState<string | null>(topics[0]?.id ?? null);

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
                className="flex min-h-11 w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                onClick={() => setOpen(isOpen ? null : topic.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-sm font-semibold text-ink-muted">
                  {topicIdx + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-base font-semibold text-ink">{lang === 'en' ? topic.name_en : topic.name_vi}</span>
                  <span className="block text-sm text-ink-muted">
                    {t({
                      en: `${topic.lessons.length} ${topic.lessons.length === 1 ? 'lesson' : 'lessons'}`,
                      vi: `${topic.lessons.length} bài học`,
                    })}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-5 w-5 text-ink-muted transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </h3>
            {isOpen && (
              <ol id={panelId} className="flex flex-col border-t border-line">
                {topic.lessons.map((lesson, lessonIdx) => (
                  <li key={lesson.id} className="border-b border-line last:border-0">
                    <Link
                      href={`/${subjectSlug}/${lesson.slug}`}
                      className="flex min-h-11 items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                    >
                      <span className="w-6 shrink-0 text-sm text-ink-muted">{lessonIdx + 1}.</span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-ink">{lang === 'en' ? lesson.title_en : lesson.title_vi}</span>
                        <span className="block text-sm text-ink-muted">{lang === 'en' ? lesson.title_vi : lesson.title_en}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-action" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
