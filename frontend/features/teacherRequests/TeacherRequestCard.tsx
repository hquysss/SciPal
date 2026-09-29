'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, GraduationCap, Send } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase';
import { cancelTeacherRequest, getMyTeacherRequest, sendTeacherRequest, type TeacherRequest } from './teacherRequestsApi';

// On the profile of a student: ask to become a teacher, follow the request, cancel it or ask again
// after a refusal. An admin decides on the account management page.

export type TeacherCardState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'none' }
  | { kind: 'form'; sending: boolean; error: string | null }
  | { kind: 'request'; request: TeacherRequest; busy: boolean };

export type TeacherRequestFields = { school: string; subject: string; note: string; evidence_url: string };

const field = 'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const label = 'text-sm font-semibold text-ink';

function RequestForm({ sending, error, onSubmit, onClose }: { sending: boolean; error: string | null; onSubmit: (fields: TeacherRequestFields) => void; onClose: () => void }) {
  const { t } = useLanguage();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const read = (name: string) => String(data.get(name) ?? '').trim();
    onSubmit({ school: read('school'), subject: read('subject'), note: read('note'), evidence_url: read('evidence_url') });
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="teacher-school" className={label}>{t({ vi: 'Trường đang dạy', en: 'School' })}</label>
          <input id="teacher-school" name="school" required maxLength={200} className={field} placeholder={t({ vi: 'THPT Nguyễn Du', en: 'Nguyen Du High School' })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="teacher-subject" className={label}>{t({ vi: 'Môn dạy', en: 'Subject' })}</label>
          <input id="teacher-subject" name="subject" required maxLength={100} className={field} placeholder={t({ vi: 'Tin học', en: 'Informatics' })} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="teacher-note" className={label}>
          {t({ vi: 'Lời nhắn cho quản trị viên', en: 'Message to the admin' })} <span className="font-normal text-ink-muted">{t({ vi: '(không bắt buộc)', en: '(optional)' })}</span>
        </label>
        <textarea id="teacher-note" name="note" rows={3} maxLength={1000} className={field} placeholder={t({ vi: 'Em dạy lớp 10, muốn soạn bài và giao bài cho lớp.', en: 'I teach grade 10 and want to write lessons for my class.' })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="teacher-evidence" className={label}>
          {t({ vi: 'Link minh chứng', en: 'Evidence link' })} <span className="font-normal text-ink-muted">{t({ vi: '(không bắt buộc)', en: '(optional)' })}</span>
        </label>
        <input id="teacher-evidence" name="evidence_url" type="url" maxLength={2048} className={field} placeholder="https://" />
        <p className="text-xs text-ink-muted">{t({ vi: 'Ví dụ trang giáo viên trên web trường, hồ sơ công khai.', en: 'For example your page on the school website or a public profile.' })}</p>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={sending} className={buttonVariants()}>
          <Send aria-hidden="true" />
          {sending ? t({ vi: 'Đang gửi…', en: 'Sending…' }) : t({ vi: 'Gửi yêu cầu', en: 'Send request' })}
        </button>
        <button type="button" onClick={onClose} disabled={sending} className={buttonVariants({ variant: 'ghost' })}>
          {t({ vi: 'Để sau', en: 'Not now' })}
        </button>
      </div>
    </form>
  );
}

export function TeacherRequestCardView({
  state,
  onOpen,
  onCancel,
  onSubmit,
  onClose,
}: {
  state: TeacherCardState;
  onOpen: () => void;
  onCancel: () => void;
  onSubmit: (fields: TeacherRequestFields) => void;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  if (state.kind === 'loading' || state.kind === 'error') return null;

  const request = state.kind === 'request' ? state.request : null;
  const pending = request?.status === 'pending';
  const rejected = request?.status === 'rejected';
  const date = request ? new Date(request.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN') : '';

  return (
    <section aria-labelledby="teacher-request-title" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-sunken text-action" aria-hidden="true">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="teacher-request-title" className="text-lg font-bold text-ink">{t({ vi: 'Bạn là giáo viên?', en: 'Are you a teacher?' })}</h2>
          <p className="text-sm text-ink-muted">
            {t({
              vi: 'Tài khoản giáo viên được soạn bài, tạo đề thi, mở lớp và giao bài cho học sinh. Quản trị viên sẽ xem và duyệt yêu cầu của bạn.',
              en: 'Teacher accounts write lessons, build exams, open classes and set work. An admin reviews your request.',
            })}
          </p>
        </div>
      </div>

      {state.kind === 'none' && (
        <button type="button" onClick={onOpen} className={buttonVariants({ className: 'self-start' })}>
          <Send aria-hidden="true" />
          {t({ vi: 'Gửi yêu cầu', en: 'Send a request' })}
        </button>
      )}

      {state.kind === 'form' && <RequestForm sending={state.sending} error={state.error} onSubmit={onSubmit} onClose={onClose} />}

      {request && pending && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-sunken p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock3 aria-hidden="true" className="h-4 w-4 text-warning" />
            {t({ vi: 'Đang chờ duyệt', en: 'Waiting for review' })}
            <span className="font-normal text-ink-muted">· {t({ vi: `gửi ngày ${date}`, en: `sent ${date}` })}</span>
          </p>
          <p className="text-sm text-ink">{request.school} · {request.subject}</p>
          <button type="button" onClick={onCancel} disabled={state.kind === 'request' && state.busy} className={buttonVariants({ variant: 'outline', className: 'self-start' })}>
            {t({ vi: 'Hủy yêu cầu', en: 'Cancel request' })}
          </button>
        </div>
      )}

      {request && rejected && (
        <div className="flex flex-col gap-3">
          <Alert tone="danger">
            {t({ vi: 'Yêu cầu trước chưa được duyệt. Lý do: ', en: 'Your last request was declined. Reason: ' })}
            {request.review_note}
          </Alert>
          <button type="button" onClick={onOpen} className={buttonVariants({ className: 'self-start' })}>
            <Send aria-hidden="true" />
            {t({ vi: 'Gửi lại yêu cầu', en: 'Ask again' })}
          </button>
        </div>
      )}

      {request && !pending && !rejected && (
        <button type="button" onClick={onOpen} className={buttonVariants({ className: 'self-start' })}>
          <Send aria-hidden="true" />
          {t({ vi: 'Gửi yêu cầu', en: 'Send a request' })}
        </button>
      )}
    </section>
  );
}

/** For students only (the profile page decides). An approval refreshes the session so the teacher menus appear. */
export function TeacherRequestCard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [state, setState] = useState<TeacherCardState>({ kind: 'loading' });

  const load = useCallback(async () => {
    try {
      const request = await getMyTeacherRequest();
      if (request?.status === 'approved') {
        // The role changed on the server: a fresh token carries it.
        await createBrowserClient().auth.refreshSession();
        router.refresh();
        return;
      }
      setState(request ? { kind: 'request', request, busy: false } : { kind: 'none' });
    } catch {
      setState({ kind: 'error' });
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (fields: TeacherRequestFields) => {
    if (!fields.school || !fields.subject) {
      setState({ kind: 'form', sending: false, error: t({ vi: 'Hãy nhập trường và môn dạy.', en: 'Enter your school and subject.' }) });
      return;
    }
    setState({ kind: 'form', sending: true, error: null });
    try {
      const request = await sendTeacherRequest({
        school: fields.school,
        subject: fields.subject,
        ...(fields.note ? { note: fields.note } : {}),
        ...(fields.evidence_url ? { evidence_url: fields.evidence_url } : {}),
      });
      setState({ kind: 'request', request, busy: false });
    } catch (error) {
      setState({ kind: 'form', sending: false, error: error instanceof Error ? error.message : t({ vi: 'Chưa gửi được yêu cầu.', en: 'Could not send the request.' }) });
    }
  };

  const cancel = async () => {
    if (state.kind !== 'request') return;
    setState({ ...state, busy: true });
    try {
      await cancelTeacherRequest();
      setState({ kind: 'none' });
    } catch {
      setState({ ...state, busy: false });
    }
  };

  return (
    <TeacherRequestCardView
      state={state}
      onOpen={() => setState({ kind: 'form', sending: false, error: null })}
      onCancel={() => void cancel()}
      onSubmit={(fields) => void submit(fields)}
      onClose={() => void load()}
    />
  );
}
