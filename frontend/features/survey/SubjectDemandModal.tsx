'use client';

import { useEffect, useRef, useState } from 'react';
import { postSurvey } from '@/lib/api';
import { useLanguage } from '@scipal/hooks';

interface SubjectDemandModalProps {
  open: boolean;
  onClose: () => void;
}

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

const subjectOptions = [
  { id: 'math', vi: 'Toán học', en: 'Mathematics', icon: '📐' },
  { id: 'physics', vi: 'Vật lí', en: 'Physics', icon: '⚡' },
  { id: 'chemistry', vi: 'Hóa học', en: 'Chemistry', icon: '🧪' },
  { id: 'biology', vi: 'Sinh học', en: 'Biology', icon: '🧬' },
  { id: 'informatics', vi: 'Tin học', en: 'Informatics', icon: '</>' },
];

const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function SubjectDemandModal({ open, onClose }: SubjectDemandModalProps) {
  const { lang, t } = useLanguage();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [grade, setGrade] = useState<number>(10);
  const [status, setStatus] = useState<SubmissionState>('idle');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    requestIdRef.current += 1;
    setStatus('idle');
    setSelectedSubjects([]);
    setGrade(10);

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      requestIdRef.current += 1;
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  const close = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((previous) => previous.includes(subject)
      ? previous.filter((item) => item !== subject)
      : [...previous, subject]);
    if (status === 'error') setStatus('idle');
  };

  const handleSubmit = async () => {
    if (selectedSubjects.length === 0 || status === 'submitting') return;
    const requestId = requestIdRef.current;
    setStatus('submitting');

    try {
      await postSurvey({
        type: 'demand',
        payload: { subjects: selectedSubjects, grade },
      });
      if (requestIdRef.current !== requestId) return;
      setStatus('success');
      closeTimerRef.current = window.setTimeout(onClose, 2200);
    } catch {
      if (requestIdRef.current !== requestId) return;
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        ref={dialogRef}
        className="relative max-h-[min(90dvh,48rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-gray-100 bg-white p-5 shadow-2xl sm:p-8 dark:border-gray-800 dark:bg-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subject-demand-title"
        lang={lang}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {t({ en: 'Learner poll · Grades 10–12', vi: 'Khảo sát người học · Lớp 10–12' })}
            </p>
            <h2 id="subject-demand-title" className="mt-1 text-lg font-black text-gray-900 dark:text-white">
              {t({ en: 'Which subjects interest you?', vi: 'Bạn quan tâm đến môn học nào?' })}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label={t({ en: 'Close survey', vi: 'Đóng khảo sát' })}
          >
            ✕
          </button>
        </div>

        {status === 'success' ? (
          <div className="space-y-4 py-8 text-center motion-reduce:animate-none" role="status" aria-live="polite">
            <span className="text-4xl" aria-hidden="true">✓</span>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              {t({ en: 'Thanks, SciPal received your input.', vi: 'Cảm ơn, SciPal đã nhận ý kiến.' })}
            </h3>
            <button
              type="button"
              onClick={close}
              className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {t({ en: 'Done', vi: 'Hoàn tất' })}
            </button>
          </div>
        ) : (
          <div className="space-y-5 pt-5">
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {t({
                en: 'Choose the natural science subjects you would like to explore on SciPal.',
                vi: 'Chọn các môn khoa học tự nhiên bạn muốn khám phá trên SciPal.',
              })}
            </p>

            {status === 'error' && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200" role="alert">
                {t({
                  en: 'We could not send your response. Your choices are still here; please try again.',
                  vi: 'Chưa gửi được ý kiến. Các lựa chọn vẫn còn, bạn hãy thử lại.',
                })}
              </p>
            )}

            <fieldset disabled={status === 'submitting'}>
              <legend className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t({ en: 'Select one or more subjects', vi: 'Chọn một hoặc nhiều môn' })}
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {subjectOptions.map((subject) => {
                  const selected = selectedSubjects.includes(subject.id);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleSubject(subject.id)}
                      className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${selected
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200'} `}
                    >
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-lg" aria-hidden="true">
                        {subject.icon}
                      </span>
                      <span>{lang === 'en' ? subject.en : subject.vi}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <fieldset disabled={status === 'submitting'}>
                <legend className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t({ en: 'Your grade', vi: 'Khối lớp của bạn' })}
                </legend>
                <div className="flex gap-2">
                  {[10, 11, 12].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={grade === value}
                      aria-label={t({ en: `Grade ${value}`, vi: `Lớp ${value}` })}
                      onClick={() => setGrade(value)}
                      className={`min-h-11 min-w-11 rounded-xl border font-mono text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${grade === value
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'} `}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="flex justify-end gap-2 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={close}
                  className="min-h-11 rounded-xl px-4 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {t({ en: 'Later', vi: 'Để sau' })}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={status === 'submitting' || selectedSubjects.length === 0}
                  className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'submitting'
                    ? t({ en: 'Sending…', vi: 'Đang gửi…' })
                    : t({ en: 'Send response', vi: 'Gửi ý kiến' })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
