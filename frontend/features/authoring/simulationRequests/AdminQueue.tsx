'use client';

import { Media } from '@/components/media/Media';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { BUILT_IN_SIMULATION_KINDS, validateSimulationBlock, type InteractiveBlock } from '@scipal/types';
import { InteractiveRenderer } from '@/components/blocks/InteractiveRenderer';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { simulationModules } from '@/features/simulations/registry';
import { EMBED_LABEL, newSimulationBlock, SimulationEditor, type NewSimulationKind } from '@/features/simulations/SimulationEditor';
import { TEXTAREA } from '../editor/editors/styles';
import {
  acceptSimulationRequest,
  completeSimulationRequest,
  declineSimulationRequest,
  listSimulationRequests,
  type ApiResult,
  type RequestStatus,
  type SimulationRequest,
} from './api';
import { STATUS_BADGE, STATUS_TEXT } from './RequestList';

type Bilingual = { en: string; vi: string };

/** Why a result block cannot be sent to the teacher, or null: the Studio's own rules. */
export function completionProblem(block: InteractiveBlock): Bilingual | null {
  if (!block.heading.vi.trim()) return { en: 'Give the simulation a Vietnamese heading.', vi: 'Hãy đặt tiêu đề tiếng Việt cho mô phỏng.' };
  const check = validateSimulationBlock(block, { mediaBase: process.env.NEXT_PUBLIC_MEDIA_PUBLIC_URL });
  return check.ok ? null : check.message;
}

const CONFLICT: Bilingual = { en: 'Someone else handled this request first. The list was reloaded.', vi: 'Đề xuất vừa được người khác xử lý. Danh sách đã được tải lại.' };

type OnChanged = (result: ApiResult<unknown>) => Promise<void>;

/** Choose a template (or an embed), set it up with the Studio's controls and preview it. */
export function CompleteForm({ request, onDone, onCancel }: { request: SimulationRequest; onDone: OnChanged; onCancel: () => void }) {
  const { t, lang } = useLanguage();
  const [kind, setKind] = useState<NewSimulationKind>('embed');
  const [block, setBlock] = useState<InteractiveBlock>(() => ({ ...newSimulationBlock('embed'), heading: { vi: request.lesson_title_vi, en: request.lesson_title_en } }));
  const [editLang, setEditLang] = useState<'vi' | 'en'>('vi');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const problem = completionProblem(block);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-action bg-surface p-3">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        {t({ en: 'Simulation template', vi: 'Mẫu mô phỏng' })}
        <select
          value={kind}
          onChange={(e) => {
            const next = e.target.value as NewSimulationKind;
            setKind(next);
            setBlock({ ...newSimulationBlock(next), heading: block.heading, ...(block.caption ? { caption: block.caption } : {}) });
          }}
          className="min-h-11 rounded-lg border border-edge bg-surface px-3 text-base font-normal text-ink"
        >
          <option value="embed">{t(EMBED_LABEL)}</option>
          {BUILT_IN_SIMULATION_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(simulationModules[k].label)}
            </option>
          ))}
        </select>
      </label>
      <SimulationEditor block={block} onChange={setBlock} lang={editLang} onLangChange={setEditLang} />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink">{t({ en: 'Preview (what the teacher will insert)', vi: 'Xem trước (giáo viên sẽ chèn khối này)' })}</p>
        <div className="rounded-lg border border-line p-3">{problem ? <p className="text-sm text-ink-muted">{t(problem)}</p> : <InteractiveRenderer block={block} lang={lang} />}</div>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        {t({ en: 'Note for the teacher (optional)', vi: 'Ghi chú cho giáo viên (không bắt buộc)' })}
        <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={`${TEXTAREA} font-normal`} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(problem) || sending}
          onClick={async () => {
            setSending(true);
            await onDone(await completeSimulationRequest(request.id, block, note));
            setSending(false);
          }}
          className={buttonVariants()}
        >
          {t({ en: 'Send the result', vi: 'Gửi kết quả cho giáo viên' })}
        </button>
        <button type="button" onClick={onCancel} className={buttonVariants({ variant: 'ghost' })}>
          {t({ en: 'Cancel', vi: 'Hủy' })}
        </button>
      </div>
    </div>
  );
}

export function AdminRequestCard({ request, onChanged }: { request: SimulationRequest; onChanged: OnChanged }) {
  const { t, lang } = useLanguage();
  const [mode, setMode] = useState<'idle' | 'decline' | 'complete'>('idle');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const active = request.status === 'open' || request.status === 'in_progress';

  const run = async (action: () => Promise<ApiResult<unknown>>) => {
    setBusy(true);
    await onChanged(await action());
    setBusy(false);
  };

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_BADGE[request.status]}>{t(STATUS_TEXT[request.status])}</Badge>
        <span className="text-sm font-semibold text-ink">{lang === 'en' ? request.lesson_title_en || request.lesson_title_vi : request.lesson_title_vi}</span>
        <span className="text-xs text-ink-muted">· {lang === 'en' ? request.subject_name_en : request.subject_name_vi}</span>
        <span className="ml-auto text-xs text-ink-muted">{new Date(request.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN')}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-ink">{request.description}</p>
      {request.reference_url && (
        <a href={request.reference_url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-action underline-offset-4 hover:underline">
          {request.reference_url}
        </a>
      )}
      {request.sketch_url && (
        <a href={request.sketch_url} target="_blank" rel="noopener noreferrer" className="self-start">
          <Media url={request.sketch_url} alt={t({ en: 'Sketch from the teacher', vi: 'Ảnh phác thảo của giáo viên' })} className="h-24 w-auto rounded border border-line" />
        </a>
      )}
      {request.admin_note && <p className="rounded-md bg-surface-sunken p-2 text-sm text-ink">{request.admin_note}</p>}

      {active && mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          {request.status === 'open' && (
            <button type="button" disabled={busy} onClick={() => run(() => acceptSimulationRequest(request.id))} className={buttonVariants({ variant: 'outline' })}>
              {t({ en: 'Take it', vi: 'Nhận làm' })}
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => setMode('complete')} className={buttonVariants()}>
            {t({ en: 'Complete', vi: 'Hoàn thành' })}
          </button>
          <button type="button" disabled={busy} onClick={() => setMode('decline')} className={buttonVariants({ variant: 'destructive' })}>
            {t({ en: 'Decline', vi: 'Từ chối' })}
          </button>
        </div>
      )}
      {active && mode === 'decline' && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            {t({ en: 'Reason (the teacher sees it)', vi: 'Lý do (giáo viên sẽ thấy)' })}
            <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={`${TEXTAREA} font-normal`} />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={busy || !note.trim()} onClick={() => run(() => declineSimulationRequest(request.id, note))} className={buttonVariants({ variant: 'destructive' })}>
              {t({ en: 'Decline', vi: 'Từ chối' })}
            </button>
            <button type="button" onClick={() => setMode('idle')} className={buttonVariants({ variant: 'ghost' })}>
              {t({ en: 'Cancel', vi: 'Hủy' })}
            </button>
          </div>
        </div>
      )}
      {active && mode === 'complete' && <CompleteForm request={request} onDone={onChanged} onCancel={() => setMode('idle')} />}
    </li>
  );
}

const FILTERS: Array<RequestStatus | 'all'> = ['open', 'in_progress', 'done', 'declined', 'all'];

/** The admin queue: filter by status and subject, act on each request. */
export function AdminQueue() {
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState<RequestStatus | 'all'>('open');
  const [subject, setSubject] = useState('all');
  const [requests, setRequests] = useState<SimulationRequest[] | null>(null);
  const [message, setMessage] = useState<{ text: Bilingual; tone: 'success' | 'danger' | 'warning' } | null>(null);

  const load = useCallback(async () => {
    const result = await listSimulationRequests(status === 'all' ? {} : { status });
    if (result.ok) setRequests(result.data.requests);
    else setMessage({ text: result.error, tone: 'danger' });
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const subjects = useMemo(() => {
    const seen = new Map<string, Bilingual>();
    for (const r of requests ?? []) if (r.subject_slug) seen.set(r.subject_slug, { vi: r.subject_name_vi, en: r.subject_name_en });
    return [...seen.entries()];
  }, [requests]);
  const shown = (requests ?? []).filter((r) => subject === 'all' || r.subject_slug === subject);

  const onChanged: OnChanged = async (result) => {
    if (result.ok) setMessage({ text: { en: 'Saved.', vi: 'Đã lưu.' }, tone: 'success' });
    else setMessage({ text: result.status === 409 ? CONFLICT : result.error, tone: result.status === 409 ? 'warning' : 'danger' });
    await load();
    window.dispatchEvent(new Event('scipal:simulation-requests-changed'));
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink">{t({ en: 'Simulation requests', vi: 'Đề xuất mô phỏng' })}</h1>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          {t({ en: 'Status', vi: 'Trạng thái' })}
          <select value={status} onChange={(e) => setStatus(e.target.value as RequestStatus | 'all')} className="min-h-11 rounded-lg border border-edge bg-surface px-3 font-normal text-ink">
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === 'all' ? t({ en: 'All', vi: 'Tất cả' }) : t(STATUS_TEXT[f])}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          {t({ en: 'Subject', vi: 'Môn' })}
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="min-h-11 rounded-lg border border-edge bg-surface px-3 font-normal text-ink">
            <option value="all">{t({ en: 'All subjects', vi: 'Tất cả các môn' })}</option>
            {subjects.map(([slug, name]) => (
              <option key={slug} value={slug}>
                {lang === 'en' ? name.en : name.vi}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}
      {!requests && <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>}
      {requests && shown.length === 0 && <p className="text-sm text-ink-muted">{t({ en: 'Nothing here.', vi: 'Không có đề xuất nào.' })}</p>}
      <ul className="flex flex-col gap-3">
        {shown.map((request) => (
          <AdminRequestCard key={`${request.id}-${request.status}`} request={request} onChanged={onChanged} />
        ))}
      </ul>
    </div>
  );
}
