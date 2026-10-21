'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { apiFetch } from './accountsApi';

// Real numbers from the database, for reports and pitches. Read only.

interface Stats {
  generated_at: string;
  accounts: { total: number; new_7d: number; new_30d: number; teachers: number };
  activity: { active_7d: number; active_30d: number; returning_30d: number; exams_submitted: number; exams_submitted_7d: number; tutor_conversations: number; capped: boolean };
  sales: { paid_orders: number; revenue_vnd: number; active_subscriptions: number };
}

type Copy = { vi: string; en: string };

function Group({ title, rows }: { title: Copy; rows: Array<[Copy, string]> }) {
  const { t } = useLanguage();
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold text-ink">{t(title)}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label.en}>
            <dt className="text-sm text-ink-muted">{t(label)}</dt>
            <dd className="text-2xl font-extrabold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function AdminStatsBoard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    apiFetch<Stats>('/api/admin/stats').then((s) => live && setStats(s)).catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  if (failed) return <p role="alert" className="mt-6 text-sm text-danger">{t({ vi: 'Không tải được số liệu.', en: 'Could not load the numbers.' })}</p>;
  if (!stats) return <p role="status" className="mt-6 text-sm text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>;

  const n = (value: number) => value.toLocaleString('vi-VN');
  const { accounts, activity, sales } = stats;
  return (
    <div className="mt-6 flex flex-col gap-5">
      <Group
        title={{ vi: 'Tài khoản', en: 'Accounts' }}
        rows={[
          [{ vi: 'Tổng', en: 'Total' }, n(accounts.total)],
          [{ vi: 'Mới 7 ngày', en: 'New, 7 days' }, n(accounts.new_7d)],
          [{ vi: 'Mới 30 ngày', en: 'New, 30 days' }, n(accounts.new_30d)],
          [{ vi: 'Giáo viên', en: 'Teachers' }, n(accounts.teachers)],
        ]}
      />
      <Group
        title={{ vi: 'Hoạt động', en: 'Activity' }}
        rows={[
          [{ vi: 'Người học 7 ngày', en: 'Active, 7 days' }, n(activity.active_7d)],
          [{ vi: 'Người học 30 ngày', en: 'Active, 30 days' }, n(activity.active_30d)],
          [{ vi: 'Quay lại (≥2 ngày khác nhau trong 30 ngày)', en: 'Returning (2+ different days in 30)' }, n(activity.returning_30d)],
          [{ vi: 'Bài thi đã nộp', en: 'Exams submitted' }, n(activity.exams_submitted)],
          [{ vi: 'Bài thi nộp 7 ngày', en: 'Exams, 7 days' }, n(activity.exams_submitted_7d)],
          [{ vi: 'Hội thoại Giáo sư AI', en: 'AI Professor chats' }, n(activity.tutor_conversations)],
        ]}
      />
      <Group
        title={{ vi: 'Thanh toán', en: 'Sales' }}
        rows={[
          [{ vi: 'Đơn đã thanh toán', en: 'Paid orders' }, n(sales.paid_orders)],
          [{ vi: 'Doanh thu (đ)', en: 'Revenue (VND)' }, n(sales.revenue_vnd)],
          [{ vi: 'Gói đang hiệu lực', en: 'Active plans' }, n(sales.active_subscriptions)],
        ]}
      />
      {activity.capped && <p className="text-sm text-ink-muted">{t({ vi: 'Số người học 30 ngày có thể thấp hơn thực tế (quá nhiều bản ghi).', en: 'The 30-day active count may be low (too many rows).' })}</p>}
      <p className="text-sm text-ink-muted">{t({ vi: 'Cập nhật', en: 'As of' })} {new Date(stats.generated_at).toLocaleString('vi-VN')}</p>
    </div>
  );
}
