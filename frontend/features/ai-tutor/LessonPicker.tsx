'use client';

import { useId, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import type { TutorLesson } from './tutorLessonTypes';

const FIELD =
  'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

/**
 * "Hỏi về bài": pick a subject, then one of its published lessons. The chosen lesson's theory goes
 * with the first question. Renders nothing when no lesson is published.
 */
export function LessonPicker({ lessons, value, onChange }: { lessons: TutorLesson[]; value: string | null; onChange: (lessonId: string | null) => void }) {
  const { t } = useLanguage();
  const ids = useId();
  const chosen = lessons.find((l) => l.id === value) ?? null;
  const [subjectId, setSubjectId] = useState(chosen?.subject_id ?? '');
  if (lessons.length === 0) return null;

  const subjects = [...new Map(lessons.map((l) => [l.subject_id, { id: l.subject_id, vi: l.subject_name_vi, en: l.subject_name_en }])).values()];
  const activeSubject = chosen?.subject_id ?? subjectId;
  const subjectLessons = lessons.filter((l) => l.subject_id === activeSubject);

  return (
    <fieldset className="grid gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <legend className="px-1 text-sm font-semibold text-ink">{t({ en: 'Ask about a lesson (optional)', vi: 'Hỏi về một bài (không bắt buộc)' })}</legend>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-subject`} className="text-sm text-ink-muted">
          {t({ en: 'Subject', vi: 'Môn' })}
        </label>
        <select
          id={`${ids}-subject`}
          value={activeSubject}
          onChange={(e) => {
            setSubjectId(e.target.value);
            onChange(null);
          }}
          className={FIELD}
        >
          <option value="">{t({ en: 'Choose a subject', vi: 'Chọn môn' })}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-lesson`} className="text-sm text-ink-muted">
          {t({ en: 'Lesson', vi: 'Bài' })}
        </label>
        <select id={`${ids}-lesson`} value={value ?? ''} disabled={!activeSubject} onChange={(e) => onChange(e.target.value || null)} className={`${FIELD} disabled:opacity-60`}>
          <option value="">{t({ en: 'No lesson', vi: 'Không chọn bài' })}</option>
          {subjectLessons.map((l) => (
            <option key={l.id} value={l.id}>
              {t({ en: `Grade ${l.grade} · ${l.title_en}`, vi: `Lớp ${l.grade} · ${l.title_vi}` })}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
