'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@scipal/supabase';
import type { Block } from '@scipal/types';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LessonPartsView } from '@/features/lessons/LessonPartsView';
import { joinLessonParts, splitLessonParts, updatePart, type BlocksUpdate, type LessonPart } from '@/features/lessons/lessonParts';
import type { LessonStatus } from './authoringQueries';
import { lessonStatusLabel, lessonStatusTone, publishBoxAfterSave } from './lessonStatus';
import { parseLessonImport, type LessonImportResult } from './lessonImport';
import { documentKind, importLessonDocument } from '../content-import/lessonDocument';
import { canAutosave, createAutosaver, type Autosaver, type AutosaveState, type SaveOutcome } from './editor/autosave';
import { BlockList } from './editor/BlockList';
import { IssueList } from './editor/IssueList';
import { lessonIssues, type LessonIssue } from './editor/lessonIssues';
import { PartTabs } from './editor/PartTabs';
import { LessonRequestsPanel } from './simulationRequests/LessonRequestsPanel';
import { PracticeQuestionsContext, usePracticeQuestionRows } from './practice/PracticeQuestionsContext';
import { leavingHref } from './editor/leaveGuard';
import { uploadLessonImage } from './editor/mediaApi';

const LESSON_TEMPLATE_URL = '/templates/scipal-lesson-template.docx';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
const AUTOSAVE_DELAY_MS = 2500;

const STATUS_BADGE = { success: 'success', danger: 'destructive', warning: 'warning', neutral: 'secondary' } as const;

type Bilingual = { en: string; vi: string };
type Message = { text: Bilingual | string; type: 'success' | 'error' };

interface LessonEditorProps {
  lessonId: string;
  /** Subject of the lesson, for term and resource search. */
  subjectId: string;
  initialTitleVi: string;
  initialTitleEn?: string;
  initialBlocks: Block[];
  initialUpdatedAt: string;
  initialStatus: LessonStatus;
  initialReviewNote: string | null;
  canReview: boolean;
}

interface LessonRow {
  status: LessonStatus;
  review_note: string | null;
  updated_at: string;
}

export function LessonEditor({
  lessonId,
  subjectId,
  initialTitleVi,
  initialTitleEn = '',
  initialBlocks,
  initialUpdatedAt,
  initialStatus,
  initialReviewNote,
  canReview,
}: LessonEditorProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [titleVi, setTitleVi] = useState(initialTitleVi);
  const [titleEn, setTitleEn] = useState(initialTitleEn);
  const [parts, setParts] = useState(() => splitLessonParts(initialBlocks));
  const blocks = useMemo(() => joinLessonParts(parts), [parts]);
  const [activePart, setActivePart] = useState<LessonPart>('lesson');
  const [focus, setFocus] = useState<{ part: LessonPart; index: number; nonce: number } | null>(null);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [status, setStatus] = useState<LessonStatus>(initialStatus);
  const [reviewNote, setReviewNote] = useState<string | null>(initialReviewNote);
  const [publishChecked, setPublishChecked] = useState(initialStatus === 'published');
  const [rejectNote, setRejectNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<AutosaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<Extract<LessonImportResult, { ok: true }> | null>(null);
  const [submitIssues, setSubmitIssues] = useState<LessonIssue[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [previewLang, setPreviewLang] = useState<'vi' | 'en'>('vi');

  const canEditContent = canReview ? status === 'draft' || status === 'published' : status === 'draft' || status === 'rejected';
  const quizIds = useMemo(() => parts.practice.flatMap((b) => (b.type === 'quiz' ? [b.question_id] : [])), [parts.practice]);
  const practice = usePracticeQuestionRows(lessonId, subjectId, quizIds);
  // Questions are judged once loaded; until then the server still checks them on submit.
  const issues = useMemo(() => lessonIssues(blocks, practice.loaded ? practice.rows : undefined), [blocks, practice.loaded, practice.rows]);
  const counts = { lesson: parts.lesson.length, simulation: parts.simulation.length, practice: parts.practice.length };
  const busy = saving || submittingForReview || reviewing;

  // The latest values, so the autosaver (created once) always saves what is on screen, and every
  // request sends the lesson version the previous save returned.
  const latest = useRef({ titleVi, titleEn, blocks, updatedAt, status });
  latest.current = { ...latest.current, titleVi, titleEn, blocks };

  const applyLesson = (lesson: LessonRow) => {
    const previous = latest.current.status;
    latest.current.status = lesson.status;
    setPublishChecked((checked) => publishBoxAfterSave(previous, lesson.status, checked));
    setStatus(lesson.status);
    setReviewNote(lesson.review_note);
    setUpdatedAt(lesson.updated_at);
    latest.current.updatedAt = lesson.updated_at;
  };

  /** Call the authoring API with the signed-in teacher's token. */
  const callApi = async (path: string, method: 'PATCH' | 'POST', body: unknown) => {
    const {
      data: { session },
    } = await createBrowserClient().auth.getSession();
    if (!session) return { ok: false as const, status: 401, data: { error: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' } };
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; lesson?: LessonRow };
    return { ok: res.ok, status: res.status, data };
  };

  // ── Saving ────────────────────────────────────────────────────────────────────────────────

  const saveDraft = useCallback(async (): Promise<SaveOutcome> => {
    const { titleVi: vi, titleEn: en, blocks: content, updatedAt: version } = latest.current;
    const body: Record<string, unknown> = { blocks: content, expected_updated_at: version };
    // The API refuses empty titles; keep saving the blocks while a title is being typed.
    if (vi.trim()) body.title_vi = vi;
    if (en.trim()) body.title_en = en;
    try {
      const res = await callApi(`/api/authoring/lessons/${lessonId}`, 'PATCH', body);
      if (res.ok && res.data.lesson) {
        applyLesson(res.data.lesson);
        setLastSavedAt(new Date());
        return 'saved';
      }
      if (res.status === 409) return 'conflict';
      setMessage({ text: res.data.error ?? { en: 'Could not save.', vi: 'Chưa lưu được.' }, type: 'error' });
      return 'failed';
    } catch {
      return 'failed';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads everything through `latest`
  }, [lessonId]);

  const saverRef = useRef<Autosaver | null>(null);
  useEffect(() => {
    const saver = createAutosaver({ delayMs: AUTOSAVE_DELAY_MS, save: saveDraft, onState: setSaveState });
    saverRef.current = saver;
    return () => saver.dispose();
  }, [saveDraft]);

  useEffect(() => {
    saverRef.current?.setEnabled(canAutosave(status) && canEditContent);
  }, [status, canEditContent]);

  // Warn before leaving with unsaved or in-flight work: tab close and reload (beforeunload), and
  // in-app links, which navigate without beforeunload.
  const leaveQuestion = t({ en: 'Leave the editor? Some changes are not saved yet.', vi: 'Rời trang soạn? Vẫn còn thay đổi chưa được lưu.' });
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!saverRef.current?.hasUnsavedWork()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const guardLinks = (event: MouseEvent) => {
      if (!saverRef.current?.hasUnsavedWork()) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      const href = leavingHref(
        {
          button: event.button,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          defaultPrevented: event.defaultPrevented,
          anchor: anchor instanceof HTMLAnchorElement ? { href: anchor.href, target: anchor.target, download: anchor.hasAttribute('download') } : null,
        },
        new URL(window.location.href),
      );
      if (href && !window.confirm(leaveQuestion)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guardLinks, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', guardLinks, true);
    };
  }, [leaveQuestion]);

  const changed = () => {
    setSubmitIssues([]);
    saverRef.current?.schedule();
  };
  const setPart = (part: LessonPart, update: BlocksUpdate) => {
    setParts((p) => updatePart(p, part, update));
    changed();
  };

  /** The "Lưu" button: the only way to save a published lesson, and how admins publish. */
  const handleSave = async () => {
    const saver = saverRef.current;
    if (!saver) return;
    setSaving(true);
    setMessage(null);
    await saver.saveNow(async () => {
      try {
        const res = await callApi(`/api/authoring/lessons/${lessonId}`, 'PATCH', {
          title_vi: titleVi,
          title_en: titleEn,
          blocks: latest.current.blocks,
          expected_updated_at: latest.current.updatedAt,
          ...(canReview ? { status: publishChecked ? 'published' : 'draft' } : {}),
        });
        if (res.ok && res.data.lesson) {
          applyLesson(res.data.lesson);
          setLastSavedAt(new Date());
          setMessage({
            text:
              res.data.lesson.status === 'published'
                ? { en: 'Saved and visible to students.', vi: 'Đã lưu. Học sinh đã thấy bài.' }
                : { en: 'Draft saved.', vi: 'Đã lưu bản nháp.' },
            type: 'success',
          });
          return 'saved';
        }
        setMessage({ text: res.data.error ?? { en: 'Save failed.', vi: 'Lưu thất bại.' }, type: 'error' });
        return res.status === 409 ? 'conflict' : 'failed';
      } catch {
        setMessage({ text: { en: 'Could not reach the server. Changes are not saved.', vi: 'Không kết nối được máy chủ. Thay đổi chưa được lưu.' }, type: 'error' });
        return 'failed';
      }
    });
    setSaving(false);
  };

  const handleSubmitForReview = async () => {
    const found = blocks.length === 0
      ? [{ part: 'lesson' as const, index: 0, blocking: true, message: { vi: 'Bài chưa có nội dung.', en: 'The lesson has no content.' } }]
      : issues;
    const titleIssue = !titleVi.trim() || !titleEn.trim();
    if (found.length > 0 || titleIssue) {
      setSubmitIssues(found);
      if (titleIssue) setMessage({ text: { en: 'Enter both titles first.', vi: 'Hãy nhập tiêu đề tiếng Việt và tiếng Anh.' }, type: 'error' });
      return;
    }
    const saver = saverRef.current;
    if (!saver) return;
    setSubmittingForReview(true);
    setMessage(null);
    // Pending edits go with the submission itself, so the autosave has nothing left to send.
    await saver.saveNow(async () => {
      try {
        const res = await callApi(`/api/authoring/lessons/${lessonId}/submit`, 'POST', {
          title_vi: titleVi,
          title_en: titleEn,
          blocks: latest.current.blocks,
          expected_updated_at: latest.current.updatedAt,
        });
        if (!res.ok || !res.data.lesson) {
          setMessage({ text: res.data.error ?? { en: 'Could not send for review.', vi: 'Không gửi được bài vào hàng chờ duyệt.' }, type: 'error' });
          return res.status === 409 ? 'conflict' : 'failed';
        }
        applyLesson(res.data.lesson);
        setMessage({ text: { en: 'Sent to the admin for review.', vi: 'Đã gửi bài vào hàng chờ admin duyệt.' }, type: 'success' });
        return 'saved';
      } catch {
        setMessage({ text: { en: 'Could not reach the server.', vi: 'Không kết nối được máy chủ. Bài chưa được gửi duyệt.' }, type: 'error' });
        return 'failed';
      }
    });
    setSubmittingForReview(false);
  };

  const handleReview = async (decision: 'approve' | 'reject') => {
    setReviewing(true);
    setMessage(null);
    try {
      const res = await callApi(`/api/authoring/lessons/${lessonId}/review`, 'PATCH', {
        decision,
        expected_updated_at: updatedAt,
        ...(decision === 'reject' && rejectNote.trim() ? { note: rejectNote.trim() } : {}),
      });
      if (!res.ok || !res.data.lesson) {
        setMessage({ text: res.data.error ?? { en: 'Could not save the review.', vi: 'Không lưu được kết quả duyệt bài.' }, type: 'error' });
        return;
      }
      applyLesson(res.data.lesson);
      router.push('/admin/lessons/review');
      router.refresh();
    } catch {
      setMessage({ text: { en: 'Could not reach the server.', vi: 'Không kết nối được máy chủ. Kết quả duyệt chưa được lưu.' }, type: 'error' });
    } finally {
      setReviewing(false);
    }
  };

  // ── Import ────────────────────────────────────────────────────────────────────────────────
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setImporting(true);
    setMessage(null);
    let result: LessonImportResult;
    try {
      result = documentKind(file.name) ? await importLessonDocument(file, { uploadImage: uploadLessonImage }) : parseLessonImport(await file.text(), file.size);
    } catch {
      result = { ok: false, error: { en: 'Could not read the file.', vi: 'Không đọc được tệp.' } };
    } finally {
      setImporting(false);
    }
    if (!result.ok) {
      setMessage({ text: result.error, type: 'error' });
      return;
    }
    if (blocks.length > 0) setPendingImport(result);
    else applyImport(result, 'replace');
  };

  const applyImport = (result: Extract<LessonImportResult, { ok: true }>, mode: 'replace' | 'append') => {
    const added = splitLessonParts(result.blocks);
    if (mode === 'replace') {
      setParts(added);
      if (result.title_en !== undefined) setTitleEn(result.title_en);
      if (result.title_vi !== undefined) setTitleVi(result.title_vi);
    } else {
      setParts((p) => ({
        lesson: [...p.lesson, ...added.lesson],
        simulation: [...p.simulation, ...added.simulation],
        practice: [...p.practice, ...added.practice],
      }));
    }
    setPendingImport(null);
    setActivePart('lesson');
    changed();
    const needsWork = lessonIssues(result.blocks).length > 0;
    const skipped = result.skippedImages ?? 0;
    const text = needsWork
      ? { en: `Imported ${result.blocks.length} blocks. Complete the marked blocks.`, vi: `Đã nạp ${result.blocks.length} khối. Hãy hoàn thiện các khối được đánh dấu.` }
      : { en: `Imported ${result.blocks.length} blocks.`, vi: `Đã nạp ${result.blocks.length} khối.` };
    if (skipped > 0) {
      text.en += ` Skipped ${skipped} images that could not be uploaded (PNG, JPG, WEBP under 4 MB only).`;
      text.vi += ` Bỏ qua ${skipped} ảnh không tải được (chỉ nhận PNG, JPG, WEBP dưới 4 MB).`;
    }
    setMessage({ text, type: 'success' });
  };

  // ── Render ────────────────────────────────────────────────────────────────────────────────
  const saveText = (() => {
    switch (saveState) {
      case 'saving':
        return t({ en: 'Saving…', vi: 'Đang lưu…' });
      case 'saved':
        return lastSavedAt
          ? t({ en: `Saved at ${lastSavedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, vi: `Đã lưu lúc ${lastSavedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` })
          : t({ en: 'Saved', vi: 'Đã lưu' });
      case 'pending':
        return t({ en: 'Unsaved changes', vi: 'Có thay đổi chưa lưu' });
      case 'failed':
        return t({ en: 'Not saved yet — will retry on the next edit', vi: 'Chưa lưu được — sẽ thử lại khi bạn sửa tiếp' });
      case 'conflict':
        return t({ en: 'This lesson changed elsewhere. Reload the page.', vi: 'Bài đã thay đổi ở nơi khác. Tải lại trang.' });
      case 'off':
        return t({ en: 'Save manually (published lesson)', vi: 'Lưu thủ công (bài đã xuất bản)' });
      default:
        return '';
    }
  })();

  const statusLabel = lessonStatusLabel(status);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_BADGE[lessonStatusTone(status)]}>{t(statusLabel)}</Badge>
            {saveText && (
              <span className={`text-sm ${saveState === 'conflict' || saveState === 'failed' ? 'font-semibold text-danger' : 'text-ink-muted'}`} aria-live="polite">
                {saveText}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canReview && (status === 'draft' || status === 'published') && (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
                <input type="checkbox" checked={publishChecked} onChange={(e) => setPublishChecked(e.target.checked)} className="h-4 w-4 accent-[var(--action)]" />
                {t({ en: 'Publish to students', vi: 'Xuất bản cho học sinh' })}
              </label>
            )}
            {canEditContent && (
              <button type="button" onClick={handleSave} disabled={busy || saveState === 'saving'} className={buttonVariants({ variant: canReview ? 'default' : 'outline' })}>
                {saving ? t({ en: 'Saving…', vi: 'Đang lưu…' }) : t({ en: 'Save', vi: 'Lưu' })}
              </button>
            )}
            {!canReview && (status === 'draft' || status === 'rejected') && (
              <button type="button" onClick={handleSubmitForReview} disabled={busy} className={buttonVariants()}>
                {submittingForReview
                  ? t({ en: 'Sending…', vi: 'Đang gửi…' })
                  : status === 'rejected'
                    ? t({ en: 'Send for review again', vi: 'Gửi duyệt lại' })
                    : t({ en: 'Send for review', vi: 'Gửi admin duyệt' })}
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            {t({ en: 'Title (Vietnamese)', vi: 'Tiêu đề tiếng Việt' })}
            <Input
              value={titleVi}
              onChange={(e) => {
                setTitleVi(e.target.value);
                changed();
              }}
              disabled={!canEditContent}
              maxLength={200}
              placeholder="Ví dụ: Cấu trúc dữ liệu mảng"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            {t({ en: 'Title (English)', vi: 'Tiêu đề tiếng Anh' })}
            <Input
              value={titleEn}
              onChange={(e) => {
                setTitleEn(e.target.value);
                changed();
              }}
              disabled={!canEditContent}
              maxLength={200}
              placeholder="e.g. Array data structures"
            />
          </label>
        </div>
      </header>

      {status === 'published' && !canReview && (
        <Alert tone="success">{t({ en: 'An admin approved this lesson. Teachers cannot edit published content.', vi: 'Bài đã được admin duyệt. Giáo viên không thể sửa nội dung đã xuất bản.' })}</Alert>
      )}
      {!canReview && status === 'pending_review' && (
        <Alert tone="warning">{t({ en: 'Sent for review. Content is locked until an admin decides.', vi: 'Bài đã gửi admin duyệt. Nội dung được khóa cho đến khi admin duyệt hoặc từ chối.' })}</Alert>
      )}
      {!canReview && status === 'rejected' && (
        <Alert tone="danger">
          {t({ en: 'The lesson needs changes before it can be sent again.', vi: 'Bài cần chỉnh sửa trước khi gửi admin duyệt lại.' })}
          {reviewNote && (
            <span className="mt-1 block font-semibold">
              {t({ en: 'Admin note', vi: 'Ghi chú của admin' })}: {reviewNote}
            </span>
          )}
        </Alert>
      )}
      {canReview && status === 'draft' && (
        <Alert tone="info">
          {t({ en: 'Draft. Tick "Publish to students" and press Save to publish.', vi: 'Bài đang là bản nháp. Tích "Xuất bản cho học sinh" rồi bấm Lưu để học sinh thấy bài.' })}
        </Alert>
      )}

      {canReview && status === 'pending_review' && (
        <section className="flex flex-col gap-3 rounded-xl border border-warning bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">{t({ en: 'Waiting for your review', vi: 'Bài đang chờ admin duyệt' })}</h3>
            <p className="mt-1 text-sm text-ink-muted">{t({ en: 'Check the preview, then approve or ask for changes.', vi: 'Kiểm tra phần xem trước rồi chọn duyệt hoặc yêu cầu chỉnh sửa.' })}</p>
          </div>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            maxLength={1000}
            rows={2}
            aria-label={t({ en: 'Note when asking for changes', vi: 'Ghi chú khi từ chối' })}
            placeholder={t({ en: 'Note when asking for changes (optional)', vi: 'Ghi chú khi từ chối (không bắt buộc)' })}
            className="w-full rounded-lg border border-edge bg-surface p-2 text-sm text-ink sm:max-w-xs"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => handleReview('reject')} disabled={busy} className={buttonVariants({ variant: 'destructive' })}>
              {t({ en: 'Ask for changes', vi: 'Từ chối' })}
            </button>
            <button type="button" onClick={() => handleReview('approve')} disabled={busy} className={buttonVariants()}>
              {t({ en: 'Approve and publish', vi: 'Duyệt và xuất bản' })}
            </button>
          </div>
        </section>
      )}

      {message && (
        <Alert tone={message.type === 'success' ? 'success' : 'danger'}>{typeof message.text === 'string' ? message.text : t(message.text)}</Alert>
      )}

      <IssueList
        issues={submitIssues}
        onJump={(issue) => {
          setActivePart(issue.part);
          setMobileView('edit');
          setFocus({ part: issue.part, index: issue.index, nonce: Date.now() });
        }}
      />

      {pendingImport && (
        <section role="dialog" aria-label={t({ en: 'Import options', vi: 'Cách nhập tệp' })} className="flex flex-col gap-3 rounded-xl border border-action bg-surface p-4">
          <p className="text-sm text-ink">
            {t({
              en: `The file has ${pendingImport.blocks.length} blocks. The lesson already has ${blocks.length}.`,
              vi: `Tệp có ${pendingImport.blocks.length} khối. Bài đang có ${blocks.length} khối.`,
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => applyImport(pendingImport, 'append')} className={buttonVariants()}>
              {t({ en: 'Add to the end of the lesson', vi: 'Thêm vào cuối bài' })}
            </button>
            <button type="button" onClick={() => applyImport(pendingImport, 'replace')} className={buttonVariants({ variant: 'destructive' })}>
              {t({ en: 'Replace the whole lesson', vi: 'Thay toàn bộ bài' })}
            </button>
            <button type="button" onClick={() => setPendingImport(null)} className={buttonVariants({ variant: 'ghost' })}>
              {t({ en: 'Cancel', vi: 'Hủy' })}
            </button>
          </div>
        </section>
      )}

      <PartTabs active={activePart} counts={counts} issues={issues} onSelect={setActivePart} />

      <div className="flex gap-1 lg:hidden" role="group" aria-label={t({ en: 'View', vi: 'Chế độ xem' })}>
        {(['edit', 'preview'] as const).map((view) => (
          <button
            key={view}
            type="button"
            aria-pressed={mobileView === view}
            onClick={() => setMobileView(view)}
            className={buttonVariants({ variant: mobileView === view ? 'secondary' : 'ghost' })}
          >
            {view === 'edit' ? t({ en: 'Edit', vi: 'Soạn' }) : t({ en: 'Preview', vi: 'Xem trước' })}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`flex flex-col gap-4 ${mobileView === 'edit' ? '' : 'hidden lg:flex'}`}>
          {canEditContent && activePart === 'lesson' && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a href={LESSON_TEMPLATE_URL} download className={buttonVariants({ variant: 'link' })}>
                {t({ en: 'Word template', vi: 'Tải mẫu Word' })}
              </a>
              <button type="button" onClick={() => importInputRef.current?.click()} disabled={importing} className={buttonVariants({ variant: 'outline' })}>
                {importing ? t({ en: 'Reading file…', vi: 'Đang đọc tệp…' }) : t({ en: 'Import Word / PDF / JSON', vi: 'Nhập từ Word / PDF / JSON' })}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".docx,.pdf,.json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/json"
                hidden
                onChange={handleImportFile}
              />
            </div>
          )}
          <PracticeQuestionsContext.Provider value={practice}>
            <BlockList
              key={activePart}
              part={activePart}
              blocks={parts[activePart]}
              onChange={(next) => setPart(activePart, next)}
              subjectId={subjectId}
              readOnly={!canEditContent}
              focusIndex={focus?.part === activePart ? focus.index : undefined}
            />
          </PracticeQuestionsContext.Provider>
          {activePart === 'simulation' && (
            <LessonRequestsPanel
              lessonId={lessonId}
              readOnly={!canEditContent}
              onInsert={(block) => setPart('simulation', (list) => [...list, block])}
            />
          )}
        </div>

        <aside className={`flex flex-col gap-3 ${mobileView === 'preview' ? '' : 'hidden lg:flex'}`} aria-label={t({ en: 'Student preview', vi: 'Xem trước như học sinh' })}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-ink">{t({ en: 'What students see', vi: 'Học sinh sẽ thấy' })}</h3>
            <div className="flex gap-1" role="group" aria-label={t({ en: 'Preview language', vi: 'Ngôn ngữ xem trước' })}>
              {(['vi', 'en'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={previewLang === code}
                  onClick={() => setPreviewLang(code)}
                  className={`min-h-9 rounded-md px-3 text-sm font-semibold ${previewLang === code ? 'bg-surface-sunken text-ink' : 'text-ink-muted hover:text-ink'}`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-h-96 flex-col gap-6 rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-20">
            <h1 className="text-2xl font-bold text-ink">{previewLang === 'en' ? titleEn || titleVi : titleVi}</h1>
            {parts[activePart].length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-muted">{t({ en: 'Nothing in this part yet.', vi: 'Phần này chưa có nội dung.' })}</p>
            ) : (
              <LessonPartsView blocks={blocks} part={activePart} lang={previewLang} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
