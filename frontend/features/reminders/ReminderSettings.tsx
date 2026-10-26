'use client';

import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { DEFAULT_REMINDER_HOUR, getReminders, saveReminders, type Reminders, type RemindersPatch } from './remindersApi';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** The daily study reminder: off by default; the learner picks the Vietnam hour and the channels. */
export function ReminderSettingsView({ value, saving, error, onChange, rowLabel, rowHint }: {
  value: Reminders;
  saving: boolean;
  error: boolean;
  onChange: (patch: RemindersPatch) => void;
  rowLabel: string;
  rowHint: string;
}) {
  const { t } = useLanguage();
  const on = value.hour !== null;
  const check = 'inline-flex min-h-11 items-center gap-2 text-sm text-ink';

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={rowLabel}>
            <BellRing aria-hidden="true" className="h-4 w-4" />
            <span id="study-reminder-label">{t({ en: 'Daily study reminder', vi: 'Nhắc học mỗi ngày' })}</span>
          </div>
          <div className={rowHint}>
            {error
              ? <span className="text-danger">{t({ en: 'Could not save. Try again.', vi: 'Chưa lưu được. Thử lại nhé.' })}</span>
              : t({ en: 'A nudge at your hour on days you have not studied yet', vi: 'Nhắc vào giờ bạn chọn, chỉ khi hôm đó bạn chưa học' })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ hour: on ? null : DEFAULT_REMINDER_HOUR })}
          disabled={saving}
          role="switch"
          aria-checked={on}
          aria-labelledby="study-reminder-label"
          className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
        >
          <span className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors motion-reduce:transition-none ${on ? 'bg-action' : 'bg-edge'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-surface transition-transform motion-reduce:transition-none ${on ? 'translate-x-5' : 'translate-x-0'}`} />
          </span>
        </button>
      </div>
      {on && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pl-6">
          <label className={check}>
            <span>{t({ en: 'Hour (Vietnam time)', vi: 'Giờ nhắc (giờ Việt Nam)' })}</span>
            <select
              value={value.hour ?? DEFAULT_REMINDER_HOUR}
              disabled={saving}
              onChange={(e) => onChange({ hour: Number(e.target.value) })}
              className="min-h-11 rounded-lg border border-edge bg-surface px-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              {HOURS.map((h) => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
            </select>
          </label>
          <label className={check}>
            <input type="checkbox" checked={value.in_app} disabled={saving} onChange={(e) => onChange({ in_app: e.target.checked })} className="h-4 w-4 accent-[var(--action)]" />
            {t({ en: 'In the app', vi: 'Trong app' })}
          </label>
          <label className={check}>
            <input type="checkbox" checked={value.email} disabled={saving || !value.email_available} onChange={(e) => onChange({ email: e.target.checked })} className="h-4 w-4 accent-[var(--action)]" />
            {t({ en: 'By e-mail', vi: 'Qua email' })}
            {!value.email_available && <span className="text-xs text-ink-muted">{t({ en: '(not available yet)', vi: '(chưa khả dụng)' })}</span>}
          </label>
        </div>
      )}
    </div>
  );
}

export function ReminderSettings({ rowLabel, rowHint }: { rowLabel: string; rowHint: string }) {
  const [value, setValue] = useState<Reminders | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    void getReminders().then((v) => alive && setValue(v));
    return () => {
      alive = false;
    };
  }, []);
  if (!value) return null;

  const change = async (patch: RemindersPatch) => {
    setSaving(true);
    setError(false);
    if (await saveReminders(patch)) setValue({ ...value, ...patch });
    else setError(true);
    setSaving(false);
  };
  return <ReminderSettingsView value={value} saving={saving} error={error} onChange={(p) => void change(p)} rowLabel={rowLabel} rowHint={rowHint} />;
}
