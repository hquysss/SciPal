'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { METRIC } from '@/features/billing/billingApi';
import { fetchAdminPlans, formFromPlan, patchFromForm, saveAdminPlan, type AdminPlan, type PlanAudit, type PlanForm } from './adminPlansApi';

type Bilingual = { vi: string; en: string };
type QuotaMetricKey = keyof typeof METRIC;

const textareaClass =
  'min-h-20 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const selectClass =
  'min-h-11 rounded-lg border border-edge bg-surface px-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const TIME = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

/** One plan's editable settings; saving sends everything with the version it was read at. */
export function PlanCard({ plan, onSaved }: { plan: AdminPlan; onSaved: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState<PlanForm>(() => formFromPlan(plan));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success'; text: Bilingual } | null>(null);
  useEffect(() => { setForm(formFromPlan(plan)); }, [plan]);

  const setLimit = (metric: string, patch: Partial<PlanForm['limits'][string]>) =>
    setForm((f) => ({ ...f, limits: { ...f.limits, [metric]: { ...f.limits[metric], ...patch } } }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const patch = patchFromForm(form, plan);
    if (!patch.ok) {
      setMessage({ tone: 'danger', text: patch.error });
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await saveAdminPlan(plan.code, patch.body);
    setSaving(false);
    if (!result.ok) {
      setMessage({ tone: 'danger', text: result.error });
      return;
    }
    setMessage({ tone: 'success', text: { vi: 'Đã lưu. Bảng giá cập nhật trong vòng 5 phút.', en: 'Saved. The pricing page updates within 5 minutes.' } });
    onSaved();
  };

  const id = (name: string) => `${plan.code}-${name}`;
  return (
    <form onSubmit={save} aria-labelledby={id('title')} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={id('title')} className="text-lg font-bold text-ink">{t(plan.name)}</h2>
        <span className="text-xs text-ink-muted">{t({ vi: `Phiên bản ${plan.version}`, en: `Version ${plan.version}` })}</span>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-ink-muted">{t({ vi: 'Hạn mức mặc định', en: 'Default limits' })}</legend>
        {plan.limits.map((l) => {
          const row = form.limits[l.metric] ?? { kind: l.kind, limit: String(l.limit) };
          const label = t(METRIC[l.metric as QuotaMetricKey]?.title ?? { vi: l.metric, en: l.metric });
          return (
            <div key={l.metric} className="flex flex-wrap items-center gap-2">
              <label htmlFor={id(l.metric)} className="min-w-0 flex-1 basis-40 text-sm text-ink">{label}</label>
              <Input id={id(l.metric)} inputMode="numeric" value={row.limit} onChange={(e) => setLimit(l.metric, { limit: e.target.value })} className="w-24 text-right tabular-nums" />
              {row.kind !== 'capacity' ? (
                <select aria-label={t({ vi: `Chu kỳ tính lượt: ${label}`, en: `Counting period: ${label}` })} value={row.kind} onChange={(e) => setLimit(l.metric, { kind: e.target.value as 'daily' | 'monthly' })} className={selectClass}>
                  <option value="daily">{t({ vi: 'Mỗi ngày', en: 'A day' })}</option>
                  <option value="monthly">{t({ vi: 'Mỗi tháng', en: 'A month' })}</option>
                </select>
              ) : (
                <span className="w-24 text-sm text-ink-muted">{t({ vi: 'Tối đa', en: 'At most' })}</span>
              )}
            </div>
          );
        })}
      </fieldset>

      {plan.prices && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold text-ink-muted">{t({ vi: 'Giá (₫)', en: 'Prices (VND)' })}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={id('month')} label={t({ vi: 'Giá theo tháng', en: 'Monthly price' })}>
              {(control) => <Input {...control} inputMode="numeric" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} className="tabular-nums" />}
            </Field>
            <Field id={id('year')} label={t({ vi: 'Giá theo năm', en: 'Yearly price' })}>
              {(control) => <Input {...control} inputMode="numeric" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} className="tabular-nums" />}
            </Field>
          </div>
          <p className="text-xs text-ink-muted">{t({ vi: 'Đổi giá tạo giá mới cho đơn sau này. Đơn đã bán giữ giá cũ.', en: 'A new price applies to new orders. Orders already sold keep their price.' })}</p>
        </fieldset>
      )}

      <Field id={id('desc-vi')} label={t({ vi: 'Mô tả (tiếng Việt)', en: 'Description (Vietnamese)' })}>
        {(control) => <textarea {...control} value={form.descriptionVi} onChange={(e) => setForm((f) => ({ ...f, descriptionVi: e.target.value }))} maxLength={500} className={textareaClass} />}
      </Field>
      <Field id={id('desc-en')} label={t({ vi: 'Mô tả (tiếng Anh)', en: 'Description (English)' })}>
        {(control) => <textarea {...control} value={form.descriptionEn} onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))} maxLength={500} className={textareaClass} />}
      </Field>
      <Field id={id('reason')} label={t({ vi: 'Lý do thay đổi', en: 'Reason for the change' })} description={t({ vi: 'Bắt buộc, được ghi vào lịch sử.', en: 'Required; kept in the history.' })}>
        {(control) => <Input {...control} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} maxLength={500} />}
      </Field>

      {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}
      <Button type="submit" disabled={saving} className="self-start">
        {saving ? t({ vi: 'Đang lưu…', en: 'Saving…' }) : t({ vi: 'Lưu gói này', en: 'Save this plan' })}
      </Button>
    </form>
  );
}

export function AuditList({ items, plans }: { items: PlanAudit[]; plans: AdminPlan[] }) {
  const { t } = useLanguage();
  const nameOf = (code: string) => {
    const plan = plans.find((p) => p.code === code);
    return plan ? t(plan.name) : code;
  };
  return (
    <section aria-labelledby="plan-audit" className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-5 py-4">
      <h2 id="plan-audit" className="text-base font-bold text-ink">{t({ vi: 'Lịch sử thay đổi', en: 'Change history' })}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">{t({ vi: 'Chưa có thay đổi nào.', en: 'No changes yet.' })}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {items.map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 py-2 text-sm">
              <span className="font-semibold text-ink">{nameOf(a.planCode)}</span>
              <span className="break-words text-ink">{a.reason}</span>
              <span className="text-xs text-ink-muted">{TIME.format(new Date(a.createdAt))}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminPlansPage() {
  const { t } = useLanguage();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; message: Bilingual } | { status: 'ready'; plans: AdminPlan[]; audit: PlanAudit[] }>({ status: 'loading' });
  const load = useCallback(async () => {
    const result = await fetchAdminPlans();
    setState(result.ok ? { status: 'ready', plans: result.data.plans, audit: result.data.audit } : { status: 'error', message: result.error });
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6">
      <PageBreadcrumb
        items={[
          { href: '/pricing', label: { en: 'Pricing', vi: 'Bảng giá' } },
          { label: { en: 'Plan limits & prices', vi: 'Hạn mức & giá gói' } },
        ]}
      />
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t({ vi: 'Hạn mức & giá gói', en: 'Plan limits & prices' })}</h1>
        <p className="max-w-prose text-sm text-ink-muted">
          {t({
            vi: 'Hạn mức mặc định áp dụng ngay cho mọi tài khoản thuộc gói; lượt đã dùng giữ nguyên. Tài khoản có hạn mức riêng (trang Quản lý tài khoản) vẫn theo hạn mức riêng.',
            en: 'Default limits apply at once to every account on the plan; usage is kept. Accounts with a custom limit (Accounts page) keep it.',
          })}
        </p>
      </header>
      {state.status === 'loading' && <p role="status" className="text-sm text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>}
      {state.status === 'error' && <Alert tone="danger">{t(state.message)}</Alert>}
      {state.status === 'ready' && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {state.plans.map((plan) => <PlanCard key={plan.code} plan={plan} onSaved={() => void load()} />)}
          </div>
          <AuditList items={state.audit} plans={state.plans} />
        </>
      )}
    </main>
  );
}
