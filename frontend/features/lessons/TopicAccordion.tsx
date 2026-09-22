'use client';
import { useState } from 'react';
import Link from 'next/link';
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
  const { lang } = useLanguage();
  const [open, setOpen] = useState<string | null>(topics[0]?.id ?? null);

  return (
    <div className="space-y-4">
      {topics.map((topic, topicIdx) => {
        const isOpen = open === topic.id;
        return (
          <div
            key={topic.id}
            className="rounded-2xl border border-gray-200/80 bg-white overflow-hidden shadow-xs transition-all duration-200"
          >
            {/* Header button */}
            <button
              className="flex w-full items-center justify-between px-6 py-4 text-left font-bold text-gray-900 hover:bg-gray-50/80 transition"
              onClick={() => setOpen(isOpen ? null : topic.id)}
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 font-mono text-xs font-bold text-gray-600">
                  {topicIdx + 1}
                </span>
                <div>
                  <span className="text-base font-bold text-gray-900 block">
                    {lang === 'en' ? topic.name_en : topic.name_vi}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">
                    {topic.lessons.length} bài học trong chủ đề
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs text-gray-400 transform transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                >
                  ▼
                </span>
              </div>
            </button>

            {/* Lesson list */}
            {isOpen && (
              <div className="border-t border-gray-100 bg-gray-50/40 p-2">
                <ul className="space-y-1.5">
                  {topic.lessons.map((lesson, lessonIdx) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/${subjectSlug}/${lesson.slug}`}
                        className="flex items-center justify-between rounded-xl px-4 py-3 bg-white border border-gray-100 hover:border-gray-300 hover:shadow-xs transition group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-[11px] font-bold text-emerald-700">
                            {lessonIdx + 1}
                          </span>
                          <div>
                            <span className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 transition block">
                              {lang === 'en' ? lesson.title_en : lesson.title_vi}
                            </span>
                            <span className="text-[11px] font-mono text-gray-400">
                              {lang === 'en' ? lesson.title_vi : lesson.title_en}
                            </span>
                          </div>
                        </div>

                        <span
                          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full text-white shadow-xs group-hover:scale-105 transition duration-150"
                          style={{ backgroundColor: 'var(--accent, #16a34a)' }}
                        >
                          <span>Học ngay</span>
                          <span aria-hidden="true">→</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
