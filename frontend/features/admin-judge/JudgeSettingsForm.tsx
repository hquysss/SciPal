'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { INPUT_CLASS as FIELD } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getJudgeSettings, saveJudgeSettings, type JudgeLimits, type JudgeSettingsSnapshot } from './api';

type Bilingual = { vi: string; en: string };

const MIN = 1;
const MAX = 1_000_000;
const number = (n: number) => n.toLocaleString('vi-VN');

const FIELDS: Array<{ key: keyof JudgeLimits; label: Bilingual; hint: Bilingual }> = [
  { key: 'globalSubmitsPerDay', label: { en: 'Submits for the whole site per day', vi: 'Lượt nộp bài cả hệ thống mỗi ngày' }, hint: { en: 'When it is used up, nobody can submit until tomorrow.', vi: 'Hết là không ai nộp được nữa đến ngày mai.' } },
  { key: 'globalRunsPerDay', label: { en: 'Trial runs for the whole site per day', vi: 'Lượt chạy thử cả hệ thống mỗi ngày' }, hint: { en: 'Same, for trial runs.', vi: 'Tương tự, cho chạy thử.' } },
];

const formOf = (s: JudgeSettingsSnapshot): Record<keyof JudgeLimits, string> => ({
  globalSubmitsPerDay: String(s.effective.globalSubmitsPerDay),
  globalRunsPerDay: String(s.effective.globalRunsPerDay),
});

/** The admin's daily limits for the code judge. The hosted judge is paid per run, so these are a spending cap. */
export function JudgeSettingsForm({ initial }: { initial?: JudgeSettingsSnapshot }) {
  const { t } = useLanguage();
  const ids = useId();
  const [snapshot, setSnapshot] = useState<JudgeSettingsSnapshot | null>(initial ?? null);
  const [form, setForm] = useState<Record<keyof JudgeLimits, string> | null>(initial ? formOf(initial) : null);
  const [message, setMessage] = useState<{ text: Bilingual; tone: 'success' | 'danger' } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) return;
    void getJudgeSettings().then((res) => {
      if (res.ok) {
        setSnapshot(res.data);
        setForm(formOf(res.data));
      } else setMessage({ text: res.error, tone: 'danger' });
    });
  }, [initial]);

  if (!snapshot || !form) {
    return message ? <Alert tone="danger">{t(message.text)}</Alert> : <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  }

  const valid = (key: keyof JudgeLimits) => {
    const n = Number(form[key]);
    return Number.isInteger(n) && n >= MIN && n <= MAX;
  };
  const allValid = FIELDS.every((f) => valid(f.key));
  const saved = formOf(snapshot);
  const dirty = FIELDS.some((f) => form[f.key] !== saved[f.key]);
  const d = snapshot.defaults;

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const res = await saveJudgeSettings({
      global_submits_per_day: Number(form.globalSubmitsPerDay),
      global_runs_per_day: Number(form.globalRunsPerDay),
    });
    setBusy(false);
    if (!res.ok) return setMessage({ text: res.error, tone: 'danger' });
    setSnapshot(res.data);
    setForm(formOf(res.data));
    setMessage({ text: { en: 'Saved. The new limits apply within 30 seconds.', vi: 'Đã lưu. Giới hạn mới có hiệu lực trong vòng 30 giây.' }, tone: 'success' });
  };

  const meter = (used: number, cap: number) => Math.min(100, Math.round((used / Math.max(1, cap)) * 100));
  const usage = [
    { label: { en: 'Submits today', vi: 'Lượt nộp bài hôm nay' }, used: snapshot.usage.submits, cap: snapshot.effective.globalSubmitsPerDay },
    { label: { en: 'Trial runs today', vi: 'Lượt chạy thử hôm nay' }, used: snapshot.usage.runs, cap: snapshot.effective.globalRunsPerDay },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={`${ids}-usage`} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2">
        <h2 id={`${ids}-usage`} className="sr-only">{t({ en: 'Usage today', vi: 'Mức dùng hôm nay' })}</h2>
        {usage.map((u) => (
          <div key={u.label.en} className="flex flex-col gap-1">
            <span className="text-2xl font-bold tabular-nums text-ink">
              {number(u.used)} <span className="text-base font-semibold text-ink-muted">/ {number(u.cap)}</span>
            </span>
            <span className="text-xs text-ink-muted">{t(u.label)}</span>
            <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" role="img" aria-label={`${meter(u.used, u.cap)}%`}>
              <div className={`h-full rounded-full ${meter(u.used, u.cap) >= 90 ? 'bg-danger' : 'bg-action'}`} style={{ width: `${meter(u.used, u.cap)}%` }} />
            </div>
          </div>
        ))}
        <p className="text-xs text-ink-muted sm:col-span-2">{t({ en: 'Counted per Vietnam day; it starts again at midnight.', vi: 'Tính theo ngày giờ Việt Nam, tính lại từ nửa đêm.' })}</p>
      </section>

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (allValid && dirty && !busy) void save();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label htmlFor={`${ids}-${f.key}`} className="text-sm font-semibold text-ink">{t(f.label)}</label>
              <input
                id={`${ids}-${f.key}`}
                type="number"
                min={MIN}
                max={MAX}
                inputMode="numeric"
                value={form[f.key]}
                aria-invalid={!valid(f.key)}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className={`${FIELD} tabular-nums`}
              />
              <p className="text-xs text-ink-muted">
                {t(f.hint)} {t({ en: `Default ${number(d[f.key])}.`, vi: `Mặc định ${number(d[f.key])}.` })}
              </p>
            </div>
          ))}
        </div>

        <p className="text-sm text-ink-muted">
          {t({
            en: 'The hosted judge charges for every run it starts, and a submit starts one run per test (about 8–11). Teacher test checks are capped at 100 a day per person and do not count toward the site totals.',
            vi: 'Máy chấm thuê tính tiền cho mỗi lượt nó chạy, và một lượt nộp bài chạy mỗi test một lượt (khoảng 8–11). Giáo viên kiểm tra bộ test tối đa 100 lần mỗi ngày mỗi người và không tính vào tổng của hệ thống.',
          })}
        </p>
        <p className="text-sm text-ink-muted">
          {t({ en: 'What each person may run a day depends on their plan: ', vi: 'Mỗi người được chạy bao nhiêu lượt mỗi ngày tùy theo gói của họ: ' })}
          <Link href="/admin/plans" className="font-semibold text-ink underline underline-offset-2">
            {t({ en: 'Plans & prices', vi: 'Hạn mức & giá gói' })}
          </Link>
          {t({ en: ' (and Accounts, for one person).', vi: ' (và Tài khoản, cho riêng một người).' })}
        </p>

        {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}

        <div>
          <Button type="submit" disabled={!dirty || !allValid || busy}>
            {busy ? t({ en: 'Saving…', vi: 'Đang lưu…' }) : t({ en: 'Save limits', vi: 'Lưu giới hạn' })}
          </Button>
        </div>
      </form>
    </div>
  );
}
