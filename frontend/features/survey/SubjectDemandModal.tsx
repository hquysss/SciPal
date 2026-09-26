'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { postSurvey } from '../../lib/api';
import { SUBJECT_CONFIG, type SubjectSlug } from '../../lib/subject-config';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';

interface SubjectDemandModalProps {
  open: boolean;
  onClose: () => void;
}

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

const subjectOptions: SubjectSlug[] = ['math', 'physics', 'chemistry', 'biology', 'informatics'];

const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--ink)_60%,transparent)] p-4">
      <div
        ref={dialogRef}
        className="relative max-h-[min(90dvh,48rem)] w-full max-w-xl overflow-y-auto rounded-xl border border-line bg-surface p-5 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subject-demand-title"
        lang={lang}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="text-sm font-semibold text-ink-muted">
              {t({ en: 'Learner poll · Grades 10–12', vi: 'Khảo sát người học · Lớp 10–12' })}
            </p>
            <h2 id="subject-demand-title" className="mt-1 text-lg font-bold text-ink">
              {t({ en: 'Which subjects interest you?', vi: 'Bạn quan tâm đến môn học nào?' })}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink ${focusRing}`}
            aria-label={t({ en: 'Close survey', vi: 'Đóng khảo sát' })}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center" role="status" aria-live="polite">
            <Check aria-hidden="true" className="h-10 w-10 text-success" />
            <h3 className="text-lg font-bold text-ink">
              {t({ en: 'Thanks, SciPal received your input.', vi: 'Cảm ơn, SciPal đã nhận ý kiến.' })}
            </h3>
            <Button type="button" onClick={close}>
              {t({ en: 'Done', vi: 'Hoàn tất' })}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5 pt-5">
            <p className="text-sm text-ink-muted">
              {t({
                en: 'Choose the natural science subjects you would like to explore on SciPal.',
                vi: 'Chọn các môn khoa học tự nhiên bạn muốn khám phá trên SciPal.',
              })}
            </p>

            {status === 'error' && (
              <Alert tone="danger">
                {t({
                  en: 'We could not send your response. Your choices are still here; please try again.',
                  vi: 'Chưa gửi được ý kiến. Các lựa chọn vẫn còn, bạn hãy thử lại.',
                })}
              </Alert>
            )}

            <fieldset disabled={status === 'submitting'}>
              <legend className="mb-2 text-sm font-semibold text-ink">
                {t({ en: 'Select one or more subjects', vi: 'Chọn một hoặc nhiều môn' })}
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {subjectOptions.map((slug) => {
                  const subject = SUBJECT_CONFIG[slug];
                  const selected = selectedSubjects.includes(slug);
                  return (
                    <button
                      key={slug}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleSubject(slug)}
                      className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 text-left text-sm font-semibold text-ink transition-colors ${focusRing} ${
                        selected ? 'border-2 border-action bg-surface' : 'border-edge bg-surface hover:bg-surface-sunken'
                      }`}
                    >
                      <span
                        data-subject-scope=""
                        style={{ '--accent': subject.accentColor } as CSSProperties}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-sm font-bold text-accent-ink"
                        aria-hidden="true"
                      >
                        {subject.icon}
                      </span>
                      <span className="flex-1">{lang === 'en' ? subject.nameEn : subject.nameVi}</span>
                      {selected && <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-action" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <fieldset disabled={status === 'submitting'}>
                <legend className="mb-2 text-sm font-semibold text-ink">
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
                      className={`min-h-11 min-w-11 rounded-lg border text-sm font-bold ${focusRing} ${
                        grade === value ? 'border-action bg-action text-action-ink' : 'border-edge bg-surface text-ink hover:bg-surface-sunken'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="flex justify-end gap-2 pt-2 sm:pt-0">
                <Button type="button" variant="ghost" onClick={close}>
                  {t({ en: 'Later', vi: 'Để sau' })}
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={status === 'submitting' || selectedSubjects.length === 0}
                >
                  {status === 'submitting'
                    ? t({ en: 'Sending…', vi: 'Đang gửi…' })
                    : t({ en: 'Send response', vi: 'Gửi ý kiến' })}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
