'use client';

import { useState, type FormEvent } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScheduledList } from '@/features/admin/scheduled/ScheduledList';
import { createScheduled, parseLocalTime } from '@/features/admin/scheduled/scheduledApi';

type Bilingual = { vi: string; en: string };
const KINDS = ['maintenance_on', 'maintenance_off'] as const;
const MIN_LEAD_MS = 60_000;

/** Plan maintenance: switch it on at a time and, if wanted, off again at another. Without an end time, an admin switches it off above. */
export function MaintenanceSchedule() {
  const { t } = useLanguage();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: Bilingual; tone: 'success' | 'danger' } | null>(null);
  const [tick, setTick] = useState(0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const from = parseLocalTime(start);
    const to = parseLocalTime(end);
    if (!from || from.getTime() < Date.now() + MIN_LEAD_MS) {
      setMessage({ tone: 'danger', text: { vi: 'Giờ bắt đầu phải sau bây giờ ít nhất 1 phút.', en: 'The start must be at least a minute from now.' } });
      return;
    }
    if (end && (!to || to.getTime() <= from.getTime())) {
      setMessage({ tone: 'danger', text: { vi: 'Giờ kết thúc phải sau giờ bắt đầu.', en: 'The end must come after the start.' } });
      return;
    }
    setBusy(true);
    setMessage(null);
    const on = await createScheduled('maintenance_on', from);
    const off = on.ok && to ? await createScheduled('maintenance_off', to) : null;
    setBusy(false);
    const failed = !on.ok ? on : off && !off.ok ? off : null;
    if (failed && !failed.ok) {
      setMessage({ tone: 'danger', text: failed.error });
    } else {
      setMessage({ tone: 'success', text: { vi: 'Đã lên lịch bảo trì.', en: 'Maintenance scheduled.' } });
      setStart('');
      setEnd('');
    }
    setTick((n) => n + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5" aria-label={t({ vi: 'Lên lịch bảo trì', en: 'Schedule maintenance' })}>
        <h2 className="text-lg font-bold text-ink">{t({ vi: 'Lên lịch bảo trì', en: 'Schedule maintenance' })}</h2>
        <p className="text-sm text-ink-muted">
          {t({
            vi: 'Đến giờ bắt đầu, web tự chuyển sang bảo trì. Có giờ kết thúc thì tự mở lại; để trống thì admin tắt thủ công ở công tắc phía trên. Giờ theo đồng hồ máy bạn. Muốn báo trước cho người dùng, hẹn một thông báo ở trang Thông báo.',
            en: 'At the start time the site goes into maintenance by itself. With an end time it reopens by itself; leave it empty and an admin switches it off above. Times use your device clock. To warn users beforehand, schedule an announcement on the Announcements page.',
          })}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="maint-start" label={t({ vi: 'Bắt đầu bảo trì', en: 'Maintenance starts' })}>
            {(c) => <Input {...c} required type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />}
          </Field>
          <Field id="maint-end" label={t({ vi: 'Kết thúc (không bắt buộc)', en: 'Ends (optional)' })}>
            {(c) => <Input {...c} type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />}
          </Field>
        </div>
        {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}
        <div>
          <Button type="submit" disabled={!start || busy}>{busy ? t({ vi: 'Đang lưu…', en: 'Saving…' }) : t({ vi: 'Lên lịch', en: 'Schedule' })}</Button>
        </div>
      </form>
      <ScheduledList kinds={KINDS} refreshKey={tick} />
    </div>
  );
}
