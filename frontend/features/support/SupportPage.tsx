'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, INPUT_CLASS } from '@/components/ui/input';
import { dayText, getMyApplication, redeemCode, sendApplication, type MyApplication } from './supportApi';

type Bilingual = { vi: string; en: string };
type Message = { text: Bilingual; tone: 'success' | 'danger' };

/** Ask a visitor to sign in, then come back here. */
function SignInPrompt() {
  const { t } = useLanguage();
  return (
    <Alert tone="info">
      <Link href="/login?redirect=/support" className="font-semibold underline">
        {t({ vi: 'Đăng nhập', en: 'Sign in' })}
      </Link>{' '}
      {t({ vi: 'để xin hỗ trợ hoặc nhập mã.', en: 'to apply for support or enter a code.' })}
    </Alert>
  );
}

function RedeemBox({ onDone }: { onDone: () => void }) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    const res = await redeemCode(code);
    setBusy(false);
    if (res.ok) {
      setCode('');
      setMessage({ text: { vi: `Đã áp dụng mã. Gói của bạn dùng được đến ${dayText(res.data.paidThrough)}.`, en: `Code applied. Your plan runs until ${dayText(res.data.paidThrough)}.` }, tone: 'success' });
      onDone();
    } else setMessage({ text: res.error, tone: 'danger' });
  };

  return (
    <form
      id="ma"
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim() && !busy) void submit();
      }}
    >
      <h2 className="text-lg font-bold text-ink">{t({ vi: 'Nhập mã hỗ trợ', en: 'Enter a support code' })}</h2>
      <p className="text-sm text-ink-muted">{t({ vi: 'Nếu SciPal đã gửi mã cho bạn, nhập vào đây để dùng gói miễn phí.', en: 'If SciPal sent you a code, enter it here to use the plan for free.' })}</p>
      <Field id="support-code" label={t({ vi: 'Mã', en: 'Code' })}>
        {(control) => (
          <Input {...control} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} placeholder="ABCD-EFGH-JKMN" />
        )}
      </Field>
      {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}
      <div>
        <Button type="submit" disabled={!code.trim() || busy}>{busy ? t({ vi: 'Đang kiểm tra…', en: 'Checking…' }) : t({ vi: 'Dùng mã', en: 'Use code' })}</Button>
      </div>
    </form>
  );
}

const STATUS_TEXT: Record<'pending' | 'approved' | 'rejected', Bilingual> = {
  pending: { vi: 'Đơn của bạn đang được xem xét.', en: 'Your application is being reviewed.' },
  approved: { vi: 'Đơn của bạn đã được duyệt.', en: 'Your application was approved.' },
  rejected: { vi: 'Đơn của bạn chưa được duyệt.', en: 'Your application was not approved.' },
};

function ApplicationForm({ onSent }: { onSent: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ fullName: '', school: '', area: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const ready = Object.values(form).every((v) => v.trim());
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    const res = await sendApplication(form);
    setBusy(false);
    if (res.ok) onSent();
    else setMessage({ text: res.error, tone: 'danger' });
  };

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !busy) void submit();
      }}
    >
      <h2 className="text-lg font-bold text-ink">{t({ vi: 'Xin hỗ trợ', en: 'Apply for support' })}</h2>
      <p className="text-sm text-ink-muted">
        {t({
          vi: 'Dành cho học sinh và giáo viên ở vùng cao, vùng sóng yếu hoặc hoàn cảnh khó khăn. Chỉ quản trị viên SciPal đọc được đơn này, và thông tin chỉ dùng để xét hỗ trợ. Đừng điền số điện thoại hay địa chỉ chi tiết.',
          en: 'For students and teachers in highland or weak-signal areas, or facing hardship. Only SciPal administrators can read this application, and it is used only to decide on support. Please do not add a phone number or a street address.',
        })}
      </p>
      <Field id="support-name" label={t({ vi: 'Họ và tên', en: 'Full name' })}>
        {(control) => <Input {...control} value={form.fullName} onChange={set('fullName')} maxLength={120} autoComplete="name" />}
      </Field>
      <Field id="support-school" label={t({ vi: 'Trường', en: 'School' })}>
        {(control) => <Input {...control} value={form.school} onChange={set('school')} maxLength={200} />}
      </Field>
      <Field id="support-area" label={t({ vi: 'Nơi ở (xã, huyện, tỉnh)', en: 'Where you live (commune, district, province)' })}>
        {(control) => <Input {...control} value={form.area} onChange={set('area')} maxLength={200} />}
      </Field>
      <Field id="support-reason" label={t({ vi: 'Vì sao bạn cần hỗ trợ?', en: 'Why do you need support?' })}>
        {(control) => <textarea {...control} value={form.reason} onChange={set('reason')} maxLength={1000} rows={4} className={`${INPUT_CLASS} py-2`} />}
      </Field>
      {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}
      <div>
        <Button type="submit" disabled={!ready || busy}>{busy ? t({ vi: 'Đang gửi…', en: 'Sending…' }) : t({ vi: 'Gửi đơn', en: 'Send application' })}</Button>
      </div>
    </form>
  );
}

/** Support for highland and hardship accounts: send an application, see how it went, or enter a code. */
export function SupportPage() {
  const { t } = useLanguage();
  const [mine, setMine] = useState<MyApplication | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'signin' | 'error'>('loading');
  const [resend, setResend] = useState(false);

  const load = useCallback(async () => {
    const res = await getMyApplication();
    if (res.ok) {
      setMine(res.data);
      setState('ready');
      setResend(false);
    } else setState(res.status === 401 ? 'signin' : 'error');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') return <p className="text-sm text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>;
  if (state === 'signin') return <SignInPrompt />;
  if (state === 'error') return <Alert tone="danger">{t({ vi: 'Chưa tải được. Thử lại sau.', en: 'Could not load. Try again later.' })}</Alert>;

  const app = mine?.application ?? null;
  const planUntil = mine?.plan?.paidThrough ?? null;
  return (
    <div className="flex flex-col gap-6">
      {app && !resend ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5" aria-live="polite">
          <h2 className="text-lg font-bold text-ink">{t({ vi: 'Đơn xin hỗ trợ', en: 'Your application' })}</h2>
          <Alert tone={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'warning' : 'info'}>
            {t(STATUS_TEXT[app.status])}
            {app.status === 'approved' && planUntil && ` ${t({ vi: `Gói dùng được đến ${dayText(planUntil)}.`, en: `Your plan runs until ${dayText(planUntil)}.` })}`}
            {app.status === 'rejected' && app.decisionNote && ` ${app.decisionNote}`}
          </Alert>
          {app.status !== 'pending' && (
            <div>
              <Button variant="outline" onClick={() => setResend(true)}>{t({ vi: 'Gửi đơn mới', en: 'Send a new application' })}</Button>
            </div>
          )}
        </section>
      ) : (
        <ApplicationForm onSent={() => void load()} />
      )}
      <RedeemBox onDone={() => void load()} />
    </div>
  );
}
