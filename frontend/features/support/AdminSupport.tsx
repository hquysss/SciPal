'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, INPUT_CLASS } from '@/components/ui/input';
import {
  createCode, dayText, decideApplication, listApplications, listCodes, revokeCode,
  type AdminApplication, type AdminCode, type SupportPlan, type SupportStatus,
} from './supportApi';

type Bilingual = { vi: string; en: string };
type Message = { text: Bilingual; tone: 'success' | 'danger' };

const ROLE: Record<'student' | 'teacher', Bilingual> = { student: { vi: 'Học sinh', en: 'Student' }, teacher: { vi: 'Giáo viên', en: 'Teacher' } };
const PLAN: Record<SupportPlan, Bilingual> = { student_plus: { vi: 'Học sinh Plus', en: 'Student Plus' }, teacher_pro: { vi: 'Giáo viên Pro', en: 'Teacher Pro' } };
const STATUS: Record<SupportStatus, Bilingual> = { pending: { vi: 'Đang chờ', en: 'Pending' }, approved: { vi: 'Đã duyệt', en: 'Approved' }, rejected: { vi: 'Từ chối', en: 'Rejected' } };

function ApplicationCard({ app, onChanged }: { app: AdminApplication; onChanged: (message: Message) => void }) {
  const { t } = useLanguage();
  const [months, setMonths] = useState(3);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const res = await decideApplication(app.id, approve ? { approve: true, months } : { approve: false, note });
    setBusy(false);
    onChanged(res.ok
      ? { text: approve ? { vi: `Đã duyệt ${months} tháng cho ${app.fullName}.`, en: `Approved ${months} months for ${app.fullName}.` } : { vi: 'Đã từ chối đơn.', en: 'Application rejected.' }, tone: 'success' }
      : { text: res.error, tone: 'danger' });
  };

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold text-ink">{app.fullName} <span className="text-sm font-normal text-ink-muted">· {t(ROLE[app.role])}</span></p>
        <p className="text-sm text-ink-muted">{t(STATUS[app.status])} · {dayText(app.createdAt)}</p>
      </div>
      <p className="text-sm text-ink">{app.school} — {app.area}</p>
      <p className="whitespace-pre-wrap text-sm text-ink-muted">{app.reason}</p>
      {app.status === 'pending' ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field id={`months-${app.id}`} label={t({ vi: 'Số tháng', en: 'Months' })}>
              {(control) => <Input {...control} type="number" min={1} max={12} value={months} onChange={(e) => setMonths(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} className="w-24" />}
            </Field>
            <Button disabled={busy} onClick={() => void decide(true)}>{t({ vi: 'Duyệt', en: 'Approve' })}</Button>
          </div>
          <Field id={`note-${app.id}`} label={t({ vi: 'Lý do nếu từ chối', en: 'Reason, if rejecting' })}>
            {(control) => <Input {...control} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}
          </Field>
          <div>
            <Button variant="destructive" disabled={busy || !note.trim()} onClick={() => void decide(false)}>{t({ vi: 'Từ chối', en: 'Reject' })}</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">
          {app.status === 'approved' ? t({ vi: `Đã cấp ${app.grantedMonths} tháng.`, en: `Granted ${app.grantedMonths} months.` }) : app.decisionNote}
        </p>
      )}
    </li>
  );
}

function Applications() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<SupportStatus>('pending');
  const [items, setItems] = useState<AdminApplication[] | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const load = useCallback(async (which: SupportStatus) => {
    const res = await listApplications(which);
    if (res.ok) setItems(res.data.applications);
    else setMessage({ text: res.error, tone: 'danger' });
  }, []);
  useEffect(() => {
    setItems(null);
    void load(status);
  }, [status, load]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t({ vi: 'Lọc theo trạng thái', en: 'Filter by status' })}>
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <Button key={s} variant={status === s ? 'default' : 'outline'} aria-pressed={status === s} onClick={() => setStatus(s)}>{t(STATUS[s])}</Button>
        ))}
      </div>
      {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}
      {items === null ? (
        <p className="text-sm text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">{t({ vi: 'Không có đơn nào.', en: 'No applications.' })}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((app) => (
            <ApplicationCard key={app.id} app={app} onChanged={(m) => { setMessage(m); void load(status); }} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Codes() {
  const { t } = useLanguage();
  const [codes, setCodes] = useState<AdminCode[] | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [fresh, setFresh] = useState<{ display: string } | null>(null);
  const [form, setForm] = useState({ planCode: 'student_plus' as SupportPlan, months: 3, maxUses: 1, expiresAt: '', note: '', code: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await listCodes();
    if (res.ok) setCodes(res.data.codes);
    else setMessage({ text: res.error, tone: 'danger' });
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    setMessage(null);
    const res = await createCode({
      planCode: form.planCode, months: form.months, maxUses: form.maxUses,
      ...(form.code.trim() ? { code: form.code.trim() } : {}),
      ...(form.expiresAt ? { expiresAt: new Date(`${form.expiresAt}T23:59:59+07:00`).toISOString() } : {}),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    });
    setBusy(false);
    if (res.ok) {
      setFresh({ display: res.data.display });
      void load();
    } else setMessage({ text: res.error, tone: 'danger' });
  };

  const revoke = async (id: string) => {
    const res = await revokeCode(id);
    setMessage(res.ok ? { text: { vi: 'Đã thu hồi mã.', en: 'Code revoked.' }, tone: 'success' } : { text: res.error, tone: 'danger' });
    void load();
  };

  const num = (key: 'months' | 'maxUses', max: number) => (e: { target: { value: string } }) => setForm({ ...form, [key]: Math.min(max, Math.max(1, Number(e.target.value) || 1)) });

  return (
    <section className="flex flex-col gap-5">
      <form
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void create();
        }}
      >
        <h2 className="text-lg font-bold text-ink">{t({ vi: 'Tạo mã mới', en: 'Create a code' })}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="code-plan" label={t({ vi: 'Gói', en: 'Plan' })}>
            {(control) => (
              <select {...control} value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value as SupportPlan })} className={INPUT_CLASS}>
                <option value="student_plus">{t(PLAN.student_plus)}</option>
                <option value="teacher_pro">{t(PLAN.teacher_pro)}</option>
              </select>
            )}
          </Field>
          <Field id="code-months" label={t({ vi: 'Số tháng (1–12)', en: 'Months (1–12)' })}>
            {(control) => <Input {...control} type="number" min={1} max={12} value={form.months} onChange={num('months', 12)} />}
          </Field>
          <Field id="code-uses" label={t({ vi: 'Số lượt dùng', en: 'Number of uses' })}>
            {(control) => <Input {...control} type="number" min={1} max={1000} value={form.maxUses} onChange={num('maxUses', 1000)} />}
          </Field>
          <Field id="code-expires" label={t({ vi: 'Hạn nhập mã (tùy chọn)', en: 'Redeem by (optional)' })}>
            {(control) => <Input {...control} type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />}
          </Field>
        </div>
        <Field
          id="code-text"
          label={t({ vi: 'Mã tự đặt (tùy chọn)', en: 'Your own code (optional)' })}
          description={t({ vi: '8–32 ký tự (chữ, số, gạch ngang). Người nhận phải nhập y hệt, kể cả hoa/thường. Để trống thì hệ thống tự tạo một mã ngẫu nhiên.', en: '8–32 characters (letters, digits, dashes). The recipient must type it exactly, case included. Leave empty to get a random code.' })}
        >
          {(control) => <Input {...control} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} maxLength={40} autoComplete="off"  className="font-mono" />}
        </Field>
        <Field
          id="code-note"
          label={t({ vi: 'Ghi chú nội bộ (tùy chọn)', en: 'Internal note (optional)' })}
          description={t({ vi: 'Chỉ ghi mã hồ sơ. Đừng ghi tên hay hoàn cảnh của học sinh.', en: 'Use a file reference only. Do not write a student’s name or circumstances.' })}
        >
          {(control) => <Input {...control} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={200} />}
        </Field>
        <div>
          <Button type="submit" disabled={busy}>{t({ vi: 'Tạo mã', en: 'Create code' })}</Button>
        </div>
      </form>

      {fresh && (
        <Alert tone="success" title={t({ vi: 'Mã mới — chỉ hiện một lần', en: 'New code — shown only once' })}>
          <p className="font-mono text-xl font-bold tracking-wider text-ink" data-testid="fresh-code">{fresh.display}</p>
          <p className="mt-1">{t({ vi: 'Sao chép và đưa cho người nhận ngay bây giờ; sau khi đóng, hệ thống không hiển thị lại được.', en: 'Copy it and give it to the recipient now; once closed it cannot be shown again.' })}</p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(fresh.display)}>{t({ vi: 'Sao chép', en: 'Copy' })}</Button>
            <Button variant="ghost" onClick={() => setFresh(null)}>{t({ vi: 'Đóng', en: 'Close' })}</Button>
          </div>
        </Alert>
      )}
      {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}

      {codes === null ? (
        <p className="text-sm text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-ink-muted">{t({ vi: 'Chưa có mã nào.', en: 'No codes yet.' })}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {codes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-ink"><span className="font-mono">…{c.hint}</span> · {t(PLAN[c.planCode])} · {c.months} {t({ vi: 'tháng', en: 'mo' })}</p>
                <p className="text-sm text-ink-muted">
                  {c.uses}/{c.maxUses} {t({ vi: 'lượt', en: 'uses' })}
                  {c.expiresAt ? ` · ${t({ vi: 'hạn', en: 'until' })} ${dayText(c.expiresAt)}` : ''}
                  {c.note ? ` · ${c.note}` : ''}
                  {c.revokedAt ? ` · ${t({ vi: 'đã thu hồi', en: 'revoked' })}` : ''}
                </p>
              </div>
              {!c.revokedAt && <Button variant="destructive" onClick={() => void revoke(c.id)}>{t({ vi: 'Thu hồi', en: 'Revoke' })}</Button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Admin: applications for highland support, and the codes that grant the same plans. */
export function AdminSupport() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'applications' | 'codes'>('applications');
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2" role="tablist">
        <Button role="tab" aria-selected={tab === 'applications'} variant={tab === 'applications' ? 'default' : 'outline'} onClick={() => setTab('applications')}>{t({ vi: 'Đơn', en: 'Applications' })}</Button>
        <Button role="tab" aria-selected={tab === 'codes'} variant={tab === 'codes' ? 'default' : 'outline'} onClick={() => setTab('codes')}>{t({ vi: 'Mã', en: 'Codes' })}</Button>
      </div>
      {tab === 'applications' ? <Applications /> : <Codes />}
    </div>
  );
}
