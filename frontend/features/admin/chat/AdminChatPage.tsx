'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { ApiResult } from '../../authoring/apiClient';
import { deleteMessage, listReports, setChatBan, type ChatReport } from './adminChatApi';

type Bilingual = { vi: string; en: string };
export type AdminChatState =
  | { status: 'loading' }
  | { status: 'error'; message: Bilingual }
  | { status: 'ready'; reports: ChatReport[] };

export function AdminChatPageView({ state, onDelete, onBan }: {
  state: AdminChatState;
  onDelete: (messageId: string) => void;
  onBan: (userId: string, banned: boolean) => void;
}) {
  const { t } = useLanguage();
  if (state.status === 'loading') return <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  if (state.status === 'error') return <Alert tone="danger">{t(state.message)}</Alert>;
  if (state.reports.length === 0) return <EmptyState title={t({ en: 'No reports to review', vi: 'Không có báo cáo nào' })} />;

  return (
    <ul className="flex flex-col gap-3">
      {state.reports.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
          <p className="whitespace-pre-wrap break-words text-ink">{r.body}</p>
          <p className="text-sm text-ink-muted">
            {r.sender_name || t({ en: 'User', vi: 'Người dùng' })} · {t({ en: 'Reason', vi: 'Lý do' })}: {r.reason}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" onClick={() => onDelete(r.message_id)}>{t({ en: 'Delete message', vi: 'Xoá tin' })}</Button>
            <Button type="button" variant="outline" onClick={() => onBan(r.sender_id, true)}>{t({ en: 'Ban from chat', vi: 'Cấm chat' })}</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminChatPage() {
  const [state, setState] = useState<AdminChatState>({ status: 'loading' });
  const [notice, setNotice] = useState<Bilingual | null>(null);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    const result = await listReports();
    setState(result.ok ? { status: 'ready', reports: result.data.reports } : { status: 'error', message: result.error });
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (call: Promise<ApiResult<unknown>>) => {
    const result = await call;
    setNotice(result.ok ? null : result.error);
    await load();
  };

  return (
    <div className="flex flex-col gap-4">
      {notice && <Alert tone="danger">{t(notice)}</Alert>}
      <AdminChatPageView state={state} onDelete={(id) => void act(deleteMessage(id))} onBan={(id, banned) => void act(setChatBan(id, banned))} />
    </div>
  );
}
