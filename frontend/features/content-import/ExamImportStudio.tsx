'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { buttonVariants } from '../../components/ui/button';
import {
  createExamWorkbookTemplate,
  englishFields,
  missingEnglish,
  parseExamWorkbookFile,
  setEnglish,
  WorkbookError,
  type ExamImportDraft,
} from './examWorkbook';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

const TYPE_LABEL = {
  mc: { en: 'Multiple choice', vi: 'Trắc nghiệm' },
  truefalse: { en: 'True / false', vi: 'Đúng / Sai' },
  short: { en: 'Short answer', vi: 'Trả lời ngắn' },
} as const;

type Status =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'saved'; questions: number; blueprints: number; pending: boolean };

/**
 * Import of questions and exams from an Excel workbook: the file is read on this device, the
 * author reviews it and fills in missing English, then one request saves everything. An admin's
 * import goes live; a teacher's waits for an admin to approve it.
 */
export function ExamImportStudio({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [draft, setDraft] = useState<ExamImportDraft | null>(null);
  // The fields missing English when the file was read stay editable while the admin types.
  const [editablePaths, setEditablePaths] = useState<string[]>([]);
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const downloadTemplate = async () => {
    const buffer = await createExamWorkbookTemplate();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'scipal-mau-nhap-de-thi.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBusy('reading');
    setStatus({ kind: 'idle' });
    setDraft(null);
    try {
      const next = await parseExamWorkbookFile(file);
      setFileName(file.name);
      setDraft(next);
      setEditablePaths(englishFields(next).filter((f) => !f.text.en.trim()).map((f) => f.path.join('.')));
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof WorkbookError ? error.message : t({ en: 'Could not read the file.', vi: 'Không đọc được tệp.' }),
      });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy('saving');
    setStatus({ kind: 'idle' });
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) {
        setStatus({ kind: 'error', message: t({ en: 'Your session expired. Sign in again.', vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' }) });
        return;
      }
      const res = await fetch(`${API_BASE}/api/authoring/exam-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: 'error', message: data.error ?? t({ en: 'Could not save the import.', vi: 'Không lưu được dữ liệu nhập.' }) });
        return;
      }
      setStatus({
        kind: 'saved',
        questions: data.imported?.questions ?? 0,
        blueprints: data.imported?.blueprints ?? 0,
        pending: data.status === 'pending_review',
      });
      setDraft(null);
      setEditablePaths([]);
    } catch {
      setStatus({ kind: 'error', message: t({ en: 'Could not reach the server. Nothing was saved.', vi: 'Không kết nối được máy chủ. Chưa có gì được lưu.' }) });
    } finally {
      setBusy(null);
    }
  };

  const missing = draft ? missingEnglish(draft) : [];
  const editable = draft ? englishFields(draft).filter((f) => editablePaths.includes(f.path.join('.'))) : [];
  const countByType = (type: keyof typeof TYPE_LABEL) => draft?.questions.filter((q) => q.type === type).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-ink">{t({ en: '1. Choose a workbook', vi: '1. Chọn tệp Excel' })}</h2>
          <p className="text-sm text-ink-muted">
            {t({
              en: 'Use the SciPal template: Questions, Question items, Exams and Exam sections. The file is read on this device and never uploaded.',
              vi: 'Dùng mẫu SciPal gồm các sheet Questions, Question items, Exams và Exam sections. Tệp được đọc ngay trên máy, không tải lên.',
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy !== null} className={buttonVariants()}>
            {busy === 'reading' ? t({ en: 'Reading…', vi: 'Đang đọc…' }) : t({ en: 'Choose .xlsx file', vi: 'Chọn tệp .xlsx' })}
          </button>
          <button type="button" onClick={() => void downloadTemplate()} className={buttonVariants({ variant: 'outline' })}>
            {t({ en: 'Download Excel template', vi: 'Tải mẫu Excel' })}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={handleFile}
          />
        </div>
      </section>

      {status.kind === 'error' && (
        <p role="alert" className="rounded-xl bg-danger-surface p-4 text-sm font-semibold text-danger">{status.message}</p>
      )}
      {status.kind === 'saved' && (
        <div role="status" className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
          <p className="font-bold text-success">
            {status.pending
              ? t({
                  en: `Sent ${status.questions} questions and ${status.blueprints} exams for admin review. Students see them once approved.`,
                  vi: `Đã gửi ${status.questions} câu hỏi và ${status.blueprints} đề thi cho admin duyệt. Học sinh thấy đề sau khi được duyệt.`,
                })
              : t({
                  en: `Saved ${status.questions} questions and ${status.blueprints} exams.`,
                  vi: `Đã lưu ${status.questions} câu hỏi và ${status.blueprints} đề thi.`,
                })}
          </p>
          {!status.pending && (
            <Link href="/exam" className="text-sm font-semibold text-action underline underline-offset-4">
              {t({ en: 'Open the exam room', vi: 'Mở phòng thi' })}
            </Link>
          )}
        </div>
      )}

      {draft && (
        <>
          <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">{t({ en: '2. Review', vi: '2. Kiểm tra' })}</h2>
            <p className="text-sm text-ink-muted">{fileName}</p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['mc', 'truefalse', 'short'] as const).map((type) => (
                <div key={type} className="rounded-lg bg-surface-sunken p-3">
                  <dt className="text-xs font-semibold text-ink-muted">{t(TYPE_LABEL[type])}</dt>
                  <dd className="text-xl font-bold tabular-nums text-ink">{countByType(type)}</dd>
                </div>
              ))}
              <div className="rounded-lg bg-surface-sunken p-3">
                <dt className="text-xs font-semibold text-ink-muted">{t({ en: 'Exams', vi: 'Đề thi' })}</dt>
                <dd className="text-xl font-bold tabular-nums text-ink">{draft.blueprints.length}</dd>
              </div>
            </dl>
            {draft.blueprints.length > 0 && (
              <ul className="flex flex-col gap-2">
                {draft.blueprints.map((b) => (
                  <li key={b.code} className="rounded-lg border border-line p-3 text-sm text-ink">
                    <span className="font-bold">{b.title.vi}</span>
                    <span className="text-ink-muted">
                      {' · '}{b.subject_slug} · {t({ en: 'Grade', vi: 'Lớp' })} {b.grade} · {b.duration_minutes} {t({ en: 'min', vi: 'phút' })} ·{' '}
                      {b.sections.map((s) => `${s.count} ${t(TYPE_LABEL[s.type]).toLowerCase()} (${t({ en: 'level', vi: 'mức' })} ${s.difficulty})`).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {editable.length > 0 && (
            <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-ink">{t({ en: '3. Fill in English', vi: '3. Điền tiếng Anh' })}</h2>
                <p className="text-sm text-ink-muted">
                  {t({
                    en: `SciPal is bilingual and does not translate for you. ${missing.length} of ${editable.length} still empty.`,
                    vi: `SciPal song ngữ và không tự dịch. Còn ${missing.length} / ${editable.length} ô trống.`,
                  })}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {editable.map((field) => (
                  <label key={field.path.join('.')} className="flex flex-col gap-1.5 text-sm">
                    <span className="font-semibold text-ink">{field.label}</span>
                    <span className="text-ink-muted">{field.text.vi}</span>
                    <input
                      type="text"
                      lang="en"
                      value={field.text.en}
                      onChange={(e) => setDraft((prev) => (prev ? setEnglish(prev, field.path, e.target.value) : prev))}
                      className="min-h-11 rounded-lg border border-edge bg-surface px-3 py-2 text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void save()} disabled={busy !== null || missing.length > 0} className={buttonVariants()}>
              {busy === 'saving'
                ? t({ en: 'Saving…', vi: 'Đang lưu…' })
                : isAdmin
                  ? t({ en: 'Save to SciPal', vi: 'Lưu vào SciPal' })
                  : t({ en: 'Send for admin review', vi: 'Gửi admin duyệt' })}
            </button>
            {missing.length > 0 && (
              <span className="text-sm text-ink-muted">{t({ en: 'Fill in every English field first.', vi: 'Điền hết các ô tiếng Anh trước khi lưu.' })}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
