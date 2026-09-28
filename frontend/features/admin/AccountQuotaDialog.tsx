'use client';

import { useEffect, useId, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { QuotaMetric } from '@scipal/types';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { belowUsage, changesFrom, PLAN_LABEL, quotaLabel, rowsFrom, validRow, type QuotaRow } from './quotaForm';
import { getAccountQuotas, getQuotaAudit, saveAccountQuotas, type AccountQuotaSnapshot, type QuotaAuditEntry } from './quotasApi';

type Bilingual = { vi: string; en: string };
type Audit = { entries: QuotaAuditEntry[]; next: string | null };

const FIELD = 'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';
const when = (iso: string) => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

/** "Lượt Tutor mỗi tháng: 30; Lượt thi…: theo gói" for the metrics an audit entry changed. */
function auditSummary(entry: QuotaAuditEntry, t: (b: Bilingual) => string, kinds: Map<string, AccountQuotaSnapshot['quotas'][number]['kind']>): string {
  const metrics = [...new Set([...Object.keys(entry.before), ...Object.keys(entry.after)])] as QuotaMetric[];
  return metrics
    .filter((m) => JSON.stringify(entry.before[m] ?? null) !== JSON.stringify(entry.after[m] ?? null))
    .map((m) => {
      const after = entry.after[m];
      const label = t(quotaLabel(m, kinds.get(m) ?? 'monthly'));
      if (!after) return `${label}: ${t({ vi: 'theo gói', en: 'plan default' })}`;
      return `${label}: ${after.limit}${after.expires_at ? ` (${t({ vi: 'đến', en: 'until' })} ${when(after.expires_at)})` : ''}`;
    })
    .join('; ');
}

/** The quotas of one account: plan, usage, custom limits with expiry, a required reason, and the audit. */
export function AccountQuotaForm({
  accountId,
  initial,
  initialAudit,
  onSaved,
}: {
  accountId: string;
  initial: AccountQuotaSnapshot;
  initialAudit?: Audit;
  onSaved?: (snapshot: AccountQuotaSnapshot) => void;
}) {
  const { t } = useLanguage();
  const ids = useId();
  const [snapshot, setSnapshot] = useState(initial);
  const [rows, setRows] = useState<QuotaRow[]>(() => rowsFrom(initial));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: Bilingual; tone: 'success' | 'danger'; stale?: boolean } | null>(null);
  const [audit, setAudit] = useState<Audit | null>(initialAudit ?? null);

  useEffect(() => {
    if (initialAudit) return;
    void getQuotaAudit(accountId).then((res) => res.ok && setAudit(res.data));
  }, [accountId, initialAudit]);

  const now = new Date();
  const changes = changesFrom(snapshot, rows);
  const rowsValid = rows.every((r) => validRow(r, now));
  const canSave = changes.length > 0 && rowsValid && reason.trim().length > 0 && reason.trim().length <= 500 && !busy;
  const setRow = (i: number, patch: Partial<QuotaRow>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const reload = async () => {
    const res = await getAccountQuotas(accountId);
    if (!res.ok) return setMessage({ text: res.error, tone: 'danger' });
    setSnapshot(res.data);
    setRows(rowsFrom(res.data));
    setMessage(null);
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const res = await saveAccountQuotas(accountId, { expectedVersion: snapshot.version, reason: reason.trim(), changes });
    setBusy(false);
    if (!res.ok) return setMessage({ text: res.error, tone: 'danger', stale: res.status === 409 });
    setSnapshot(res.data);
    setRows(rowsFrom(res.data));
    setReason('');
    setMessage({ text: { vi: 'Đã lưu hạn mức.', en: 'Quotas saved.' }, tone: 'success' });
    onSaved?.(res.data);
    const log = await getQuotaAudit(accountId);
    if (log.ok) setAudit(log.data);
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) void save();
      }}
    >
      <p className="text-sm text-ink-muted">
        {t({ vi: 'Gói hiện tại', en: 'Current plan' })}: <span className="font-semibold text-ink">{t(PLAN_LABEL[snapshot.account.plan] ?? { vi: snapshot.account.plan, en: snapshot.account.plan })}</span>
        {snapshot.account.paidThrough ? ` · ${t({ vi: 'đến', en: 'until' })} ${when(snapshot.account.paidThrough)}` : ''}
      </p>

      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
        {snapshot.quotas.map((q, i) => {
          const row = rows[i];
          const custom = row.mode === 'custom';
          const low = belowUsage(row, q);
          const valid = validRow(row, now);
          const id = `${ids}-${q.metric}`;
          return (
            <li key={q.metric} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-semibold text-ink">{t(quotaLabel(q.metric, q.kind))}</span>
                <span className="text-sm tabular-nums text-ink-muted">
                  {t({ vi: `Đã dùng ${q.used}`, en: `Used ${q.used}` })}
                  {q.reserved > 0 ? t({ vi: ` · đang giữ ${q.reserved}`, en: ` · held ${q.reserved}` }) : ''}
                  {' · '}
                  {t({ vi: `hiện ${q.limit}`, en: `now ${q.limit}` })}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
                <select
                  aria-label={t({ vi: `Cách tính ${quotaLabel(q.metric, q.kind).vi}`, en: `How ${quotaLabel(q.metric, q.kind).en} is set` })}
                  value={row.mode}
                  onChange={(e) => setRow(i, { mode: e.target.value as QuotaRow['mode'], ...(e.target.value === 'custom' && q.source === 'plan' ? { limit: String(q.planLimit) } : {}) })}
                  className={`${FIELD} sm:w-56`}
                >
                  <option value="plan">{t({ vi: `Theo gói (${q.planLimit})`, en: `Plan default (${q.planLimit})` })}</option>
                  <option value="custom">{t({ vi: 'Riêng tài khoản này', en: 'Custom for this account' })}</option>
                </select>
                {custom && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${id}-limit`} className="text-sm font-semibold text-ink">{t({ vi: 'Tổng hạn mức', en: 'Total limit' })}</label>
                      <input
                        id={`${id}-limit`}
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={row.limit}
                        aria-invalid={!valid}
                        onChange={(e) => setRow(i, { limit: e.target.value })}
                        className={`${FIELD} tabular-nums`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${id}-expires`} className="text-sm font-semibold text-ink">{t({ vi: 'Hết hạn (giờ VN, để trống = đến khi thu hồi)', en: 'Expires (Vietnam time; empty = until revoked)' })}</label>
                      <input id={`${id}-expires`} type="datetime-local" value={row.expires} onChange={(e) => setRow(i, { expires: e.target.value })} className={FIELD} />
                    </div>
                  </>
                )}
              </div>
              {low && (
                <p className="flex items-start gap-1.5 text-sm text-warning">
                  <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  {t({ vi: 'Hạn mức này thấp hơn số đã dùng — tài khoản sẽ không dùng thêm được đến kỳ sau. Vẫn lưu được.', en: 'This limit is under what is already used — the account cannot use more until the next period. You can still save.' })}
                </p>
              )}
              {custom && !valid && <p className="text-sm text-danger">{t({ vi: 'Nhập số nguyên ≥ 0 và ngày hết hạn ở tương lai.', en: 'Enter a whole number ≥ 0 and a future expiry.' })}</p>}
            </li>
          );
        })}
      </ul>
      <p className="-mt-3 text-xs text-ink-muted">{t({ vi: '0 = không được dùng (không phải không giới hạn). Khôi phục theo gói giữ nguyên số đã dùng.', en: '0 = not allowed (not unlimited). Returning to the plan keeps usage.' })}</p>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-reason`} className="text-sm font-semibold text-ink">{t({ vi: 'Lý do (bắt buộc, ghi vào nhật ký)', en: 'Reason (required, kept in the log)' })}</label>
        <textarea id={`${ids}-reason`} required rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={`${FIELD} py-2`} />
      </div>

      {message && (
        <Alert tone={message.tone}>
          {t(message.text)}
          {message.stale && (
            <Button type="button" variant="outline" className="mt-2" onClick={() => void reload()}>
              {t({ vi: 'Tải lại hạn mức', en: 'Reload quotas' })}
            </Button>
          )}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSave}>
          {busy ? t({ vi: 'Đang lưu…', en: 'Saving…' }) : t({ vi: 'Lưu hạn mức', en: 'Save quotas' })}
        </Button>
        {changes.length > 0 && <span className="text-sm text-ink-muted">{t({ vi: `${changes.length} thay đổi`, en: `${changes.length} change(s)` })}</span>}
      </div>

      <section className="flex flex-col gap-2 border-t border-line pt-4">
        <h3 className="text-sm font-bold text-ink">{t({ vi: 'Nhật ký thay đổi', en: 'Change log' })}</h3>
        {!audit ? (
          <p className="text-sm text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>
        ) : audit.entries.length === 0 ? (
          <p className="text-sm text-ink-muted">{t({ vi: 'Chưa có thay đổi nào.', en: 'No changes yet.' })}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {audit.entries.map((e) => (
              <li key={e.id} className="rounded-lg bg-surface-sunken px-3 py-2 text-sm">
                <p className="text-ink">{auditSummary(e, t, new Map(snapshot.quotas.map((q) => [q.metric, q.kind])))}</p>
                <p className="text-xs text-ink-muted">
                  {e.actor?.name ?? t({ vi: 'Admin', en: 'Admin' })} · {when(e.createdAt)} · “{e.reason}”
                </p>
              </li>
            ))}
          </ul>
        )}
        {audit?.next && (
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                const res = await getQuotaAudit(accountId, audit.next!);
                if (res.ok) setAudit({ entries: [...audit.entries, ...res.data.entries], next: res.data.next });
              }}
            >
              {t({ vi: 'Xem thêm', en: 'Show more' })}
            </Button>
          </div>
        )}
      </section>
    </form>
  );
}

/** Opens from the accounts list; loads the account's quotas when shown. */
export function AccountQuotaDialog({ account, onClose }: { account: { id: string; name: string } | null; onClose: () => void }) {
  const { t } = useLanguage();
  const [state, setState] = useState<{ id: string; data: AccountQuotaSnapshot } | { id: string; error: Bilingual } | null>(null);

  useEffect(() => {
    if (!account) return;
    setState(null);
    void getAccountQuotas(account.id).then((res) => setState(res.ok ? { id: account.id, data: res.data } : { id: account.id, error: res.error }));
  }, [account]);

  return (
    <Dialog
      open={account !== null}
      onClose={onClose}
      title={t({ vi: `Hạn mức · ${account?.name ?? ''}`, en: `Quotas · ${account?.name ?? ''}` })}
      closeLabel={t({ vi: 'Đóng', en: 'Close' })}
      className="max-w-2xl"
    >
      <div className="mt-4">
        {!state || state.id !== account?.id ? (
          <p className="text-sm text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>
        ) : 'error' in state ? (
          <Alert tone="danger">{t(state.error)}</Alert>
        ) : (
          <AccountQuotaForm accountId={state.id} initial={state.data} />
        )}
      </div>
    </Dialog>
  );
}
