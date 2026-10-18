'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cancelScheduled, listScheduled, type Scheduled, type ScheduledKind, type ScheduledStatus } from './scheduledApi';

type Bilingual = { vi: string; en: string };

const STATUS: Record<ScheduledStatus, Bilingual> = {
  pending: { vi: 'Đang chờ', en: 'Waiting' },
  running: { vi: 'Đang chạy', en: 'Running' },
  done: { vi: 'Đã chạy', en: 'Done' },
  cancelled: { vi: 'Đã hủy', en: 'Cancelled' },
  failed: { vi: 'Lỗi', en: 'Failed' },
};

const dateOf = (iso: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

/** What was scheduled, with when and how it went; a waiting one can be cancelled. `refreshKey` reloads after the page adds one. */
export function ScheduledList({ kinds, refreshKey = 0 }: { kinds: readonly ScheduledKind[]; refreshKey?: number }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<Scheduled[] | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);

  const load = useCallback(async () => {
    const result = await listScheduled();
    if (result.ok) setItems(result.data.scheduled.filter((s) => kinds.includes(s.kind)));
    else setError(result.error);
  }, [kinds]);
  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const label = (s: Scheduled): string => {
    if (s.kind === 'announcement') return t({ vi: `Gửi thông báo: ${s.payload.title_vi ?? ''}`, en: `Send announcement: ${s.payload.title_en ?? ''}` });
    return s.kind === 'maintenance_on' ? t({ vi: 'Bật bảo trì', en: 'Switch maintenance on' }) : t({ vi: 'Tắt bảo trì', en: 'Switch maintenance off' });
  };

  const cancel = async (id: string) => {
    const result = await cancelScheduled(id);
    if (result.ok) setItems((prev) => prev?.map((s) => (s.id === id ? { ...s, status: 'cancelled' } : s)) ?? prev);
    else setError(result.error);
  };

  return (
    <section aria-labelledby="scheduled-list" className="flex flex-col gap-3">
      <h2 id="scheduled-list" className="text-lg font-bold text-ink">{t({ vi: 'Đã lên lịch', en: 'Scheduled' })}</h2>
      {error && <Alert tone="danger">{t(error)}</Alert>}
      {items && items.length === 0 && <p className="text-sm text-ink-muted">{t({ vi: 'Chưa có lịch nào.', en: 'Nothing scheduled.' })}</p>}
      <ul className="flex flex-col gap-3">
        {items?.map((s) => (
          <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="min-w-0">
              <p className="break-words font-semibold text-ink">{label(s)}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {dateOf(s.run_at)} · {t(STATUS[s.status])}
                {s.status === 'failed' && s.error ? ` · ${s.error}` : ''}
              </p>
            </div>
            {s.status === 'pending' && <Button type="button" variant="outline" onClick={() => void cancel(s.id)}>{t({ vi: 'Hủy lịch', en: 'Cancel' })}</Button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
