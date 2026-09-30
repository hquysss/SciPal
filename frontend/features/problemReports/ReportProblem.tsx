'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, LifeBuoy, Send } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { CATEGORY_LABEL, MESSAGE_MAX, MESSAGE_MIN, isSignedIn, sendProblemReport, type ProblemCategory } from './problemReportsApi';

// "Báo cáo vấn đề": a short form in a dialog, from the landing footer and the profile page.
// Visitors may leave an e-mail to be answered; an account is answered at its own e-mail.

type Bilingual = { vi: string; en: string };
export type ReportFormState =
  | { kind: 'form'; sending: boolean; error: Bilingual | null }
  | { kind: 'sent' };

const field = 'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const label = 'text-sm font-semibold text-ink';
const CATEGORIES = Object.keys(CATEGORY_LABEL) as ProblemCategory[];

export function ReportFormView({
  state,
  askEmail,
  onSubmit,
  onClose,
}: {
  state: ReportFormState;
  askEmail: boolean;
  onSubmit: (fields: { category: ProblemCategory; message: string; email: string }) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  if (state.kind === 'sent') {
    return (
      <div className="mt-4 flex flex-col items-start gap-4">
        <p className="flex items-start gap-2 text-base text-ink">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-action" />
          {t({ vi: 'Đã gửi. Cảm ơn bạn! SciPal sẽ xem và sửa sớm nhất có thể.', en: 'Sent. Thank you! SciPal will look into it as soon as possible.' })}
        </p>
        <button type="button" onClick={onClose} className={buttonVariants()}>
          {t({ vi: 'Đóng', en: 'Close' })}
        </button>
      </div>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({
      category: (String(data.get('category') ?? 'bug') as ProblemCategory),
      message: String(data.get('message') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
    });
  };

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-category" className={label}>{t({ vi: 'Vấn đề về', en: 'What is it about' })}</label>
        <select id="report-category" name="category" defaultValue="bug" className={field}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(CATEGORY_LABEL[c])}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-message" className={label}>{t({ vi: 'Chuyện gì đã xảy ra?', en: 'What happened?' })}</label>
        <textarea
          id="report-message"
          name="message"
          required
          rows={5}
          minLength={MESSAGE_MIN}
          maxLength={MESSAGE_MAX}
          className={field}
          placeholder={t({ vi: 'Ví dụ: Bấm "Học ngay" ở môn Tin học nhưng không mở được bài.', en: 'For example: I pressed "Start now" on Informatics but the lesson did not open.' })}
        />
        <p className="text-xs text-ink-muted">{t({ vi: 'SciPal tự gửi kèm địa chỉ trang bạn đang xem.', en: 'SciPal adds the address of the page you are on.' })}</p>
      </div>
      {askEmail && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-email" className={label}>
            {t({ vi: 'Email để SciPal trả lời', en: 'Email for our answer' })}{' '}
            <span className="font-normal text-ink-muted">{t({ vi: '(không bắt buộc)', en: '(optional)' })}</span>
          </label>
          <input id="report-email" name="email" type="email" maxLength={320} autoComplete="email" className={field} placeholder="ban@gmail.com" />
        </div>
      )}
      {state.error && <Alert tone="danger">{t(state.error)}</Alert>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={state.sending} className={buttonVariants()}>
          <Send aria-hidden="true" />
          {state.sending ? t({ vi: 'Đang gửi…', en: 'Sending…' }) : t({ vi: 'Gửi báo cáo', en: 'Send report' })}
        </button>
        <button type="button" onClick={onClose} disabled={state.sending} className={buttonVariants({ variant: 'ghost' })}>
          {t({ vi: 'Hủy', en: 'Cancel' })}
        </button>
      </div>
    </form>
  );
}

/** The button that opens the report form; `children` is its label, `className` its look. */
export function ReportProblemButton({ className, children }: { className?: string; children?: ReactNode }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [askEmail, setAskEmail] = useState(false);
  const [state, setState] = useState<ReportFormState>({ kind: 'form', sending: false, error: null });

  const show = () => {
    setState({ kind: 'form', sending: false, error: null });
    setOpen(true);
    void isSignedIn().then((signedIn) => setAskEmail(!signedIn));
  };

  const submit = async (fields: { category: ProblemCategory; message: string; email: string }) => {
    if (fields.message.length < MESSAGE_MIN) {
      setState({ kind: 'form', sending: false, error: { vi: `Mô tả thêm một chút (ít nhất ${MESSAGE_MIN} ký tự).`, en: `Tell us a little more (at least ${MESSAGE_MIN} characters).` } });
      return;
    }
    setState({ kind: 'form', sending: true, error: null });
    const result = await sendProblemReport({
      category: fields.category,
      message: fields.message,
      page_url: window.location.href,
      ...(askEmail && fields.email ? { email: fields.email } : {}),
    });
    setState(result.ok ? { kind: 'sent' } : { kind: 'form', sending: false, error: result.error });
  };

  return (
    <>
      <button type="button" onClick={show} className={className}>
        {children ?? t({ vi: 'Báo cáo vấn đề', en: 'Report a problem' })}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <LifeBuoy aria-hidden="true" className="h-5 w-5 text-[var(--coral)]" />
            {t({ vi: 'Báo cáo vấn đề', en: 'Report a problem' })}
          </span>
        }
        closeLabel={t({ vi: 'Đóng', en: 'Close' })}
      >
        <ReportFormView state={state} askEmail={askEmail} onSubmit={(fields) => void submit(fields)} onClose={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

/** At the bottom of the profile page. */
export function ReportProblemCard() {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="report-problem-title" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-sunken text-[var(--coral)]" aria-hidden="true">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="report-problem-title" className="text-lg font-bold text-ink">{t({ vi: 'Gặp vấn đề?', en: 'Something wrong?' })}</h2>
          <p className="text-sm text-ink-muted">
            {t({ vi: 'Lỗi trang, bài học sai hay trục trặc thanh toán, báo cho SciPal để được sửa.', en: 'A broken page, a wrong lesson or a payment hiccup: tell SciPal and it gets fixed.' })}
          </p>
        </div>
      </div>
      <ReportProblemButton className={buttonVariants({ variant: 'outline', className: 'shrink-0 self-start sm:self-auto' })} />
    </section>
  );
}
