'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import type { InteractiveBlock } from '@scipal/types';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import type { RequestStatus, SimulationRequest } from './api';

export const STATUS_TEXT: Record<RequestStatus, { en: string; vi: string }> = {
  open: { en: 'Sent', vi: 'Đã gửi' },
  in_progress: { en: 'In progress', vi: 'Đang làm' },
  done: { en: 'Done', vi: 'Đã xong' },
  declined: { en: 'Declined', vi: 'Từ chối' },
};
export const STATUS_BADGE = { open: 'secondary', in_progress: 'warning', done: 'success', declined: 'destructive' } as const;

interface RequestListProps {
  requests: SimulationRequest[];
  onWithdraw: (request: SimulationRequest) => void;
  /** In the Studio: add a finished result to the lesson being edited. */
  onInsert?: (request: SimulationRequest, block: InteractiveBlock) => void;
  /** Results already inserted during this visit. */
  inserted?: ReadonlySet<string>;
  /** On the teacher-wide page: name and link each lesson. */
  showLesson?: boolean;
  busyId?: string | null;
}

export function RequestList({ requests, onWithdraw, onInsert, inserted, showLesson, busyId }: RequestListProps) {
  const { t, lang } = useLanguage();
  if (requests.length === 0) {
    return <p className="text-sm text-ink-muted">{t({ en: 'No requests yet.', vi: 'Chưa có đề xuất nào.' })}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => {
        const date = new Date(request.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN');
        return (
          <li key={request.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_BADGE[request.status]}>{t(STATUS_TEXT[request.status])}</Badge>
              <span className="text-xs text-ink-muted">{date}</span>
              {showLesson && (
                <Link href={`/teacher/lessons/${request.lesson_id}`} className="text-sm font-semibold text-action underline-offset-4 hover:underline">
                  {lang === 'en' ? request.lesson_title_en || request.lesson_title_vi : request.lesson_title_vi}
                </Link>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink">{request.description}</p>
            {request.reference_url && (
              <a href={request.reference_url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-action underline-offset-4 hover:underline">
                {request.reference_url}
              </a>
            )}
            {request.admin_note && (
              <p className="rounded-md bg-surface-sunken p-2 text-sm text-ink">
                <span className="font-semibold">{t({ en: 'Admin note', vi: 'Ghi chú của admin' })}: </span>
                {request.admin_note}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {request.status === 'open' && (
                <button type="button" onClick={() => onWithdraw(request)} disabled={busyId === request.id} className={buttonVariants({ variant: 'ghost' })}>
                  {t({ en: 'Withdraw', vi: 'Rút lại' })}
                </button>
              )}
              {request.status === 'done' && request.result_block && onInsert && (
                <button
                  type="button"
                  onClick={() => onInsert(request, request.result_block!)}
                  disabled={inserted?.has(request.id)}
                  className={buttonVariants()}
                >
                  {inserted?.has(request.id) ? t({ en: 'Inserted', vi: 'Đã chèn' }) : t({ en: 'Insert into the lesson', vi: 'Chèn vào bài' })}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
