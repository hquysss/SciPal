'use client';

import { useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { TEXTAREA } from '@/features/authoring/editor/editors/styles';
import { createTerm, EMPTY_DRAFT, type StaffTerm, type SubjectOption, type TermDraft } from './api';

type Bilingual = { en: string; vi: string };

const INPUT =
  'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** What must be filled in before the term can be sent, or null. */
export function termFormProblem(draft: TermDraft): Bilingual | null {
  if (!draft.subject_id) return { en: 'Choose a subject.', vi: 'Hãy chọn môn học.' };
  if (!draft.term_en.trim() || !draft.term_vi.trim()) return { en: 'Enter the term in English and Vietnamese.', vi: 'Hãy nhập thuật ngữ bằng cả tiếng Anh và tiếng Việt.' };
  if (!draft.definition_en.trim() || !draft.definition_vi.trim()) return { en: 'Enter the definition in both languages.', vi: 'Hãy nhập định nghĩa bằng cả hai thứ tiếng.' };
  return null;
}

function Field({ id, label, children }: { id: string; label: Bilingual; children: (id: string) => React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {t(label)}
      </label>
      {children(id)}
    </div>
  );
}

export function TermForm({ subjects, isAdmin, onSaved }: { subjects: SubjectOption[]; isAdmin: boolean; onSaved: (term: StaffTerm) => void }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<TermDraft>(EMPTY_DRAFT);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Bilingual | null>(null);
  const [done, setDone] = useState<Bilingual | null>(null);
  const problem = termFormProblem(draft);
  const set = (key: keyof TermDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    setDone(null);
    if (problem) return;
    setSending(true);
    const result = await createTerm(draft);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setTried(false);
    // Keep the subject: staff usually add several terms to one subject in a row.
    setDraft({ ...EMPTY_DRAFT, subject_id: draft.subject_id });
    setDone(
      isAdmin
        ? { en: `“${result.data.term.term_en}” is now in the glossary.`, vi: `Đã thêm “${result.data.term.term_vi}” vào từ điển.` }
        : { en: `“${result.data.term.term_en}” was sent to an admin for review.`, vi: `Đã gửi “${result.data.term.term_vi}” cho admin duyệt.` },
    );
    onSaved(result.data.term);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <Field id="term-subject" label={{ en: 'Subject', vi: 'Môn học' }}>
        {(id) => (
          <select id={id} value={draft.subject_id} onChange={set('subject_id')} className={INPUT}>
            <option value="">{t({ en: 'Choose a subject…', vi: 'Chọn môn…' })}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {t({ en: s.name_en, vi: s.name_vi })}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="term-vi" label={{ en: 'Term (Vietnamese)', vi: 'Thuật ngữ (tiếng Việt)' }}>
          {(id) => <input id={id} value={draft.term_vi} onChange={set('term_vi')} maxLength={120} className={INPUT} />}
        </Field>
        <Field id="term-en" label={{ en: 'Term (English)', vi: 'Thuật ngữ (tiếng Anh)' }}>
          {(id) => <input id={id} value={draft.term_en} onChange={set('term_en')} maxLength={120} lang="en" className={INPUT} />}
        </Field>
        <Field id="term-def-vi" label={{ en: 'Definition (Vietnamese)', vi: 'Định nghĩa (tiếng Việt)' }}>
          {(id) => <textarea id={id} rows={3} value={draft.definition_vi} onChange={set('definition_vi')} maxLength={1000} className={`${TEXTAREA} font-normal`} />}
        </Field>
        <Field id="term-def-en" label={{ en: 'Definition (English)', vi: 'Định nghĩa (tiếng Anh)' }}>
          {(id) => <textarea id={id} rows={3} value={draft.definition_en} onChange={set('definition_en')} maxLength={1000} lang="en" className={`${TEXTAREA} font-normal`} />}
        </Field>
        <Field id="term-ex-vi" label={{ en: 'Example (Vietnamese, optional)', vi: 'Ví dụ (tiếng Việt, không bắt buộc)' }}>
          {(id) => <input id={id} value={draft.example_vi} onChange={set('example_vi')} maxLength={1000} className={INPUT} />}
        </Field>
        <Field id="term-ex-en" label={{ en: 'Example (English, optional)', vi: 'Ví dụ (tiếng Anh, không bắt buộc)' }}>
          {(id) => <input id={id} value={draft.example_en} onChange={set('example_en')} maxLength={1000} lang="en" className={INPUT} />}
        </Field>
        <Field id="term-pos" label={{ en: 'Part of speech (optional)', vi: 'Từ loại (không bắt buộc)' }}>
          {(id) => <input id={id} value={draft.part_of_speech} onChange={set('part_of_speech')} maxLength={40} placeholder="noun" className={INPUT} />}
        </Field>
      </div>

      {tried && problem && <Alert tone="danger">{t(problem)}</Alert>}
      {error && <Alert tone="danger">{t(error)}</Alert>}
      {done && (
        <p role="status" className="text-sm font-semibold text-action">
          {t(done)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={sending} className={buttonVariants()}>
          {isAdmin ? t({ en: 'Add to the glossary', vi: 'Thêm vào từ điển' }) : t({ en: 'Send for admin review', vi: 'Gửi admin duyệt' })}
        </button>
        {!isAdmin && <span className="text-sm text-ink-muted">{t({ en: 'The term appears in the glossary once an admin approves it.', vi: 'Thuật ngữ hiện trong từ điển sau khi admin duyệt.' })}</span>}
      </div>
    </form>
  );
}
