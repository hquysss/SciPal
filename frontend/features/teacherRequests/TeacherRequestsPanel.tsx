'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, GraduationCap, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { approveTeacherRequest, listTeacherRequests, rejectTeacherRequest, type TeacherRequest } from './teacherRequestsApi';

// On the admin account management page: students asking to become teachers. Approve makes the
// account a teacher; decline needs a reason, which the student sees on their profile.

const safeHref = (value: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
};

type Props = {
  requests: TeacherRequest[];
  busyId: string | null;
  rejecting: string | null;
  reason: string;
  error: string | null;
  lang: 'en' | 'vi';
  onApprove: (request: TeacherRequest) => void;
  onStartReject: (id: string) => void;
  onReason: (value: string) => void;
  onReject: (request: TeacherRequest) => void;
  onCancelReject: () => void;
};

export function TeacherRequestsPanelView({ requests, busyId, rejecting, reason, error, lang, onApprove, onStartReject, onReason, onReject, onCancelReject }: Props) {
  const { t } = useLanguage();
  if (requests.length === 0) return null;

  return (
    <Card className="mb-6 gap-0 py-0" aria-labelledby="teacher-requests-heading">
      <div className="flex items-center gap-2 border-b border-line bg-surface-sunken px-5 py-3 sm:px-7">
        <GraduationCap aria-hidden="true" className="h-5 w-5 text-action" />
        <h2 id="teacher-requests-heading" className="text-base font-semibold text-ink">
          {t({ vi: 'Yêu cầu làm giáo viên', en: 'Teacher requests' })}
          <span className="ml-2 rounded-full bg-action px-2 py-0.5 text-xs font-bold text-action-ink">{requests.length}</span>
        </h2>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {requests.map((request) => {
          const href = safeHref(request.evidence_url);
          const busy = busyId === request.id;
          return (
            <li key={request.id} className="flex flex-col gap-3 px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-semibold text-ink">
                    {request.display_name ?? request.email ?? request.user_id}
                    {request.display_name && request.email && <span className="ml-2 font-normal text-ink-muted">{request.email}</span>}
                  </p>
                  <p className="text-sm text-ink">{request.school} · {request.subject}</p>
                  {request.note && <p className="text-sm text-ink-muted">“{request.note}”</p>}
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
                    <span>{new Date(request.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'vi-VN')}</span>
                    {href && (
                      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-action underline-offset-4 hover:underline">
                        {t({ vi: 'Minh chứng', en: 'Evidence' })}
                        <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      </a>
                    )}
                  </p>
                </div>
                {rejecting !== request.id && (
                  <div className="flex gap-2">
                    <Button type="button" disabled={busy} onClick={() => onApprove(request)}>
                      <Check aria-hidden="true" />
                      {t({ vi: 'Duyệt', en: 'Approve' })}
                    </Button>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => onStartReject(request.id)}>
                      <X aria-hidden="true" />
                      {t({ vi: 'Từ chối', en: 'Decline' })}
                    </Button>
                  </div>
                )}
              </div>
              {rejecting === request.id && (
                <div className="flex flex-col gap-2">
                  <label htmlFor={`reject-reason-${request.id}`} className="text-sm font-semibold text-ink">
                    {t({ vi: 'Lý do từ chối (học sinh sẽ thấy)', en: 'Reason (the student will see it)' })}
                  </label>
                  <textarea
                    id={`reject-reason-${request.id}`}
                    rows={2}
                    maxLength={1000}
                    value={reason}
                    onChange={(event) => onReason(event.target.value)}
                    className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="destructive" disabled={busy || !reason.trim()} onClick={() => onReject(request)}>
                      {t({ vi: 'Xác nhận từ chối', en: 'Confirm decline' })}
                    </Button>
                    <Button type="button" variant="ghost" disabled={busy} onClick={onCancelReject}>
                      {t({ vi: 'Thôi', en: 'Back' })}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <div className="px-5 pb-4 sm:px-7">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
    </Card>
  );
}

/** Loads the pending requests; `onApproved` lets the page show the new teacher in its list. */
export function TeacherRequestsPanel({ onApproved }: { onApproved: (userId: string) => void }) {
  const { lang, t } = useLanguage();
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await listTeacherRequests());
    } catch {
      // The account list reports connection problems; this panel stays hidden.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (request: TeacherRequest, run: () => Promise<unknown>, done?: () => void) => {
    setBusyId(request.id);
    setError(null);
    try {
      await run();
      setRequests((current) => current.filter((r) => r.id !== request.id));
      setRejecting(null);
      setReason('');
      done?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t({ vi: 'Chưa xử lý được yêu cầu.', en: 'Could not handle the request.' }));
      void load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <TeacherRequestsPanelView
      requests={requests}
      busyId={busyId}
      rejecting={rejecting}
      reason={reason}
      error={error}
      lang={lang}
      onApprove={(request) => void act(request, () => approveTeacherRequest(request.id), () => onApproved(request.user_id))}
      onStartReject={(id) => {
        setRejecting(id);
        setReason('');
      }}
      onReason={setReason}
      onReject={(request) => void act(request, () => rejectTeacherRequest(request.id, reason.trim()))}
      onCancelReject={() => setRejecting(null)}
    />
  );
}
