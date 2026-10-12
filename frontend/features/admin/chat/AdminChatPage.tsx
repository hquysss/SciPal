'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { ApiResult } from '../../authoring/apiClient';
import { deleteMessage, listReports, resolveReport, setChatBan, type ChatReport } from './adminChatApi';

type Bilingual = { vi: string; en: string };
export type AdminChatState =
  | { status: 'loading' }
  | { status: 'error'; message: Bilingual }
  | { status: 'ready'; reports: ChatReport[] };

export function AdminChatPageView({ state, onDelete, onBan, onResolve }: {
  state: AdminChatState;
  onDelete: (messageId: string) => void;
  onBan: (userId: string, banned: boolean) => void;
  onResolve: (reportId: string) => void;
}) {
  const { t } = useLanguage();
  if (state.status === 'loading') return <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  if (state.status === 'error') return <Alert tone="danger">{t(state.message)}</Alert>;
  if (state.reports.length === 0) return <EmptyState title={t({ en: 'No reports to review', vi: 'Không có báo cáo nào' })} />;

  return (
    <ul className="flex flex-col gap-4">
      {state.reports.map((report) => {
        const senders = [...new Map(report.messages.map((m) => [m.sender_id, m.sender_name])).entries()];
        return (
          <li key={report.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold text-ink">{report.label}</h2>
              <p className="text-sm text-ink-muted">{t({ en: 'Reason', vi: 'Lý do' })}: {report.reason}</p>
            </div>

            <ul className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-3">
              {report.messages.map((m) => (
                <li key={m.id} className="flex flex-col gap-1 text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{m.sender_name || t({ en: 'User', vi: 'Người dùng' })}</span>
                    {m.deleted
                      ? <span className="text-ink-muted">{t({ en: 'Deleted', vi: 'Đã xoá' })}</span>
                      : <Button type="button" variant="link" className="min-h-8 px-1 text-xs" onClick={() => onDelete(m.id)}>{t({ en: 'Delete message', vi: 'Xoá tin' })}</Button>}
                  </span>
                  {m.image_url?.startsWith('https://') && (
                    <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="block w-fit overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image_url} alt={t({ en: 'Reported picture', vi: 'Ảnh bị báo cáo' })} loading="lazy" className="max-h-40 max-w-full object-cover" />
                    </a>
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words text-ink">{m.body}</p>}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              {senders.map(([id, name]) => (
                <Button key={id} type="button" variant="outline" aria-label={`${t({ en: 'Ban from chat', vi: 'Cấm chat' })} ${name}`} onClick={() => onBan(id, true)}>
                  {t({ en: 'Ban from chat', vi: 'Cấm chat' })}: {name}
                </Button>
              ))}
              <Button type="button" className="ml-auto" onClick={() => onResolve(report.id)}>{t({ en: 'Mark handled', vi: 'Đã xử lý' })}</Button>
            </div>
          </li>
        );
      })}
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
      <AdminChatPageView
        state={state}
        onDelete={(id) => void act(deleteMessage(id))}
        onBan={(id, banned) => void act(setChatBan(id, banned))}
        onResolve={(id) => void act(resolveReport(id))}
      />
    </div>
  );
}
