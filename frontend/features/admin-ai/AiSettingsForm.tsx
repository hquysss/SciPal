'use client';

import { useEffect, useId, useState } from 'react';
import { KeyRound, PlugZap } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getAiSettings, saveAiSettings, testAiSettings, type AiProvider, type AiSettingsSnapshot, type AiTestResult } from './api';

type Bilingual = { vi: string; en: string };

const FIELD = 'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';
const PROVIDERS: Array<{ id: AiProvider; name: string; env: string }> = [
  { id: 'gemini', name: 'Gemini', env: 'GEMINI_API_KEY' },
  { id: 'openai', name: 'OpenAI', env: 'OPENAI_API_KEY' },
];

type Form = { provider: AiProvider; model: string; limit: string; enabled: boolean; translateEnabled: boolean; translateLimit: string };
const CHARS_MIN = 1000;
const CHARS_MAX = 5_000_000;
const number = (n: number) => n.toLocaleString('vi-VN');
const formOf = (s: AiSettingsSnapshot): Form => ({
  provider: s.effective.provider,
  model: s.saved?.model ?? '',
  limit: String(s.effective.dailyLimit),
  enabled: s.effective.enabled,
  translateEnabled: s.translate.effective.enabled,
  translateLimit: String(s.translate.effective.dailyChars),
});

/** The admin's AI tutor settings. API keys are never entered here: only whether each is set. */
export function AiSettingsForm({ initial }: { initial?: AiSettingsSnapshot }) {
  const { t } = useLanguage();
  const ids = useId();
  const [snapshot, setSnapshot] = useState<AiSettingsSnapshot | null>(initial ?? null);
  const [form, setForm] = useState<Form | null>(initial ? formOf(initial) : null);
  const [message, setMessage] = useState<{ text: Bilingual; tone: 'success' | 'danger' } | null>(null);
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [test, setTest] = useState<AiTestResult | null>(null);

  useEffect(() => {
    if (initial) return;
    void getAiSettings().then((res) => {
      if (res.ok) {
        setSnapshot(res.data);
        setForm(formOf(res.data));
      } else setMessage({ text: res.error, tone: 'danger' });
    });
  }, [initial]);

  if (!snapshot || !form) {
    return message ? <Alert tone="danger">{t(message.text)}</Alert> : <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  }

  const limit = Number(form.limit);
  const limitValid = Number.isInteger(limit) && limit >= 1 && limit <= 200;
  const chars = Number(form.translateLimit);
  const charsValid = Number.isInteger(chars) && chars >= CHARS_MIN && chars <= CHARS_MAX;
  const modelValid = form.model.trim() === '' || /^[A-Za-z0-9._:/-]{1,100}$/.test(form.model.trim());
  const chosen = PROVIDERS.find((p) => p.id === form.provider)!;
  const saved = formOf(snapshot);
  const dirty = form.provider !== saved.provider || form.model.trim() !== saved.model || form.limit !== saved.limit || form.enabled !== saved.enabled || form.translateEnabled !== saved.translateEnabled || form.translateLimit !== saved.translateLimit;

  const save = async () => {
    setBusy('save');
    setMessage(null);
    setTest(null);
    const res = await saveAiSettings({ provider: form.provider, model: form.model.trim() || null, daily_limit: limit, enabled: form.enabled, translate_enabled: form.translateEnabled, translate_daily_chars: chars });
    setBusy(null);
    if (!res.ok) return setMessage({ text: res.error, tone: 'danger' });
    setSnapshot(res.data);
    setForm(formOf(res.data));
    setMessage({ text: { en: 'Saved. Students get the new settings within a minute.', vi: 'Đã lưu. Học sinh nhận cài đặt mới trong vòng một phút.' }, tone: 'success' });
  };

  const runTest = async () => {
    setBusy('test');
    setTest(null);
    const res = await testAiSettings();
    setBusy(null);
    if (!res.ok) return setMessage({ text: res.error, tone: 'danger' });
    setTest(res.data);
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={`${ids}-usage`} className="grid grid-cols-3 gap-3 rounded-2xl border border-line bg-surface p-4">
        <h2 id={`${ids}-usage`} className="sr-only">{t({ en: 'Usage', vi: 'Mức dùng' })}</h2>
        {[
          { n: snapshot.usage.today, label: { en: 'questions today', vi: 'câu hỏi hôm nay' } },
          { n: snapshot.usage.week, label: { en: 'questions in 7 days', vi: 'câu hỏi trong 7 ngày' } },
          { n: snapshot.usage.students_week, label: { en: 'students in 7 days', vi: 'học sinh trong 7 ngày' } },
        ].map((item) => (
          <div key={item.label.vi} className="flex flex-col">
            <span className="text-2xl font-bold tabular-nums text-ink">{item.n}</span>
            <span className="text-xs text-ink-muted">{t(item.label)}</span>
          </div>
        ))}
      </section>

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (limitValid && modelValid && charsValid && dirty && !busy) void save();
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-ink">{t({ en: 'Provider', vi: 'Nhà cung cấp' })}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROVIDERS.map((p) => {
              const active = form.provider === p.id;
              const hasKey = snapshot.keys[p.id];
              return (
                <label
                  key={p.id}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus ${active ? 'border-action bg-surface' : 'border-line bg-surface hover:border-edge'}`}
                >
                  <input type="radio" name={`${ids}-provider`} value={p.id} checked={active} onChange={() => setForm({ ...form, provider: p.id })} className="h-5 w-5 accent-[var(--action)]" />
                  <span className="flex-1 font-semibold text-ink">{p.name}</span>
                  <span className={`inline-flex items-center gap-1 text-xs ${hasKey ? 'text-success' : 'text-warning'}`}>
                    <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
                    {hasKey ? t({ en: 'Key set', vi: 'Đã đặt key' }) : t({ en: 'No key', vi: 'Chưa đặt key' })}
                  </span>
                </label>
              );
            })}
          </div>
          {!snapshot.keys[form.provider] && (
            <Alert tone="warning">
              {t({
                en: `${chosen.name} has no key on the backend. Add ${chosen.env} in the sci-pal-backend environment on Vercel (and backend/.env locally), then redeploy.`,
                vi: `Backend chưa có key của ${chosen.name}. Thêm ${chosen.env} vào biến môi trường của sci-pal-backend trên Vercel (và backend/.env khi chạy máy), rồi deploy lại.`,
              })}
            </Alert>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-model`} className="text-sm font-semibold text-ink">Model</label>
            <input
              id={`${ids}-model`}
              value={form.model}
              maxLength={100}
              placeholder={snapshot.defaults[form.provider]}
              aria-invalid={!modelValid}
              aria-describedby={`${ids}-model-hint`}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className={`${FIELD} font-mono text-sm`}
            />
            <p id={`${ids}-model-hint`} className="text-xs text-ink-muted">
              {modelValid
                ? t({ en: `Empty uses ${snapshot.defaults[form.provider]}.`, vi: `Để trống sẽ dùng ${snapshot.defaults[form.provider]}.` })
                : t({ en: 'Letters, digits and . _ : / - only.', vi: 'Chỉ gồm chữ, số và . _ : / -' })}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-limit`} className="text-sm font-semibold text-ink">{t({ en: 'Questions per student per day', vi: 'Số câu hỏi mỗi học sinh mỗi ngày' })}</label>
            <input
              id={`${ids}-limit`}
              type="number"
              min={1}
              max={200}
              inputMode="numeric"
              value={form.limit}
              aria-invalid={!limitValid}
              onChange={(e) => setForm({ ...form, limit: e.target.value })}
              className={`${FIELD} tabular-nums`}
            />
            <p className="text-xs text-ink-muted">{t({ en: '1–200, counted per Vietnam day.', vi: '1–200, tính theo ngày giờ Việt Nam.' })}</p>
          </div>
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-5 w-5 accent-[var(--action)]" />
          <span className="text-base text-ink">{t({ en: 'Tutor on for students', vi: 'Bật gia sư cho học sinh' })}</span>
          {!form.enabled && <span className="text-sm text-ink-muted">{t({ en: '— students see “taking a break”', vi: '— học sinh thấy “Gia sư đang tạm nghỉ”' })}</span>}
        </label>

        <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-1 text-sm font-semibold text-ink">{t({ en: 'Automatic translation for teachers', vi: 'Dịch tự động cho giáo viên' })}</legend>
          <p className="text-sm text-ink-muted">
            {t({
              en: 'Fills empty English when a lesson or question is saved. Uses the same service and model as the tutor.',
              vi: 'Điền phần tiếng Anh còn trống khi lưu bài hoặc câu hỏi. Dùng cùng dịch vụ và model với gia sư.',
            })}
          </p>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={form.translateEnabled} onChange={(e) => setForm({ ...form, translateEnabled: e.target.checked })} className="h-5 w-5 accent-[var(--action)]" />
            <span className="text-base text-ink">{t({ en: 'Turn on automatic translation while authoring', vi: 'Bật dịch tự động khi soạn bài' })}</span>
          </label>
          <div className="flex flex-col gap-1 sm:max-w-xs">
            <label htmlFor={`${ids}-chars`} className="text-sm font-semibold text-ink">{t({ en: 'Characters per teacher per day', vi: 'Số ký tự mỗi giáo viên mỗi ngày' })}</label>
            <input
              id={`${ids}-chars`}
              type="number"
              min={CHARS_MIN}
              max={CHARS_MAX}
              step={1000}
              inputMode="numeric"
              value={form.translateLimit}
              aria-invalid={!charsValid}
              onChange={(e) => setForm({ ...form, translateLimit: e.target.value })}
              className={`${FIELD} tabular-nums`}
            />
            <p className="text-xs text-ink-muted">{t({ en: `${number(CHARS_MIN)}–${number(CHARS_MAX)}. A lesson page is about 3 000.`, vi: `${number(CHARS_MIN)}–${number(CHARS_MAX)}. Một trang bài khoảng 3.000 ký tự.` })}</p>
          </div>
          <p className="text-sm text-ink-muted">
            {t({
              en: `Translated: ${number(snapshot.translate.usage.today)} characters today, ${number(snapshot.translate.usage.week)} in 7 days.`,
              vi: `Đã dịch: ${number(snapshot.translate.usage.today)} ký tự hôm nay, ${number(snapshot.translate.usage.week)} trong 7 ngày.`,
            })}
          </p>
        </fieldset>

        {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!dirty || !limitValid || !modelValid || !charsValid || busy !== null}>
            {busy === 'save' ? t({ en: 'Saving…', vi: 'Đang lưu…' }) : t({ en: 'Save settings', vi: 'Lưu cài đặt' })}
          </Button>
          <Button type="button" variant="outline" disabled={busy !== null || dirty} onClick={() => void runTest()} title={dirty ? t({ en: 'Save first, then test', vi: 'Lưu trước rồi thử' }) : undefined}>
            <PlugZap aria-hidden="true" />
            {busy === 'test' ? t({ en: 'Testing…', vi: 'Đang thử…' }) : t({ en: 'Test connection', vi: 'Thử kết nối' })}
          </Button>
          <span className="text-xs text-ink-muted">
            {t({ en: `In force: ${snapshot.effective.provider} · ${snapshot.effective.model}`, vi: `Đang dùng: ${snapshot.effective.provider} · ${snapshot.effective.model}` })}
          </span>
        </div>

        {test && (
          <Alert tone={test.ok ? 'success' : 'danger'}>
            {test.ok
              ? t({ en: `${test.model} answered “${test.reply}” in ${test.ms} ms.`, vi: `${test.model} trả lời “${test.reply}” sau ${test.ms} ms.` })
              : t({ en: `${test.model} failed: ${test.error}`, vi: `${test.model} lỗi: ${test.error}` })}
          </Alert>
        )}
      </form>
    </div>
  );
}
