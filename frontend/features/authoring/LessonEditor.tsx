'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@scipal/supabase';
import type { Block } from '@scipal/types';
import { BlockPalette } from './BlockPalette';
import { ArrowDown, ArrowUp, Eye, FileUp, Trash2 } from 'lucide-react';
import { LevelScope, SubjectProvider } from '@scipal/ui';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { LessonSheet } from '@/components/blocks/LessonSheet';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { levelOfGrade } from '@/features/landing/educationLevel';
import { useLanguage } from '@scipal/hooks';
import type { LessonStatus } from './authoringQueries';
import { LessonStatusBadge } from './lessonStatusBadge';
import { parseLessonImport } from './lessonImport';

const BLOCK_TYPE_LABELS: Record<Block['type'], { en: string; vi: string }> = {
  theory: { en: 'Theory', vi: 'Lý thuyết' },
  code: { en: 'Code', vi: 'Mã nguồn' },
  formula: { en: 'Formula', vi: 'Công thức' },
  quiz: { en: 'Quiz', vi: 'Câu hỏi' },
  interactive: { en: 'Simulation', vi: 'Mô phỏng' },
  'term-ref': { en: 'Term', vi: 'Thuật ngữ' },
  'resource-ref': { en: 'Resource', vi: 'Tài nguyên' },
};

interface LessonEditorProps {
  lessonId: string;
  initialTitleVi: string;
  initialTitleEn?: string;
  initialBlocks: Block[];
  initialUpdatedAt: string;
  initialStatus: LessonStatus;
  initialReviewNote: string | null;
  canReview: boolean;
  grade: number;
  subjectSlug: string;
}

export function LessonEditor({
  lessonId,
  initialTitleVi,
  initialTitleEn = '',
  initialBlocks,
  initialUpdatedAt,
  initialStatus,
  initialReviewNote,
  canReview,
  grade,
  subjectSlug,
}: LessonEditorProps) {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [titleVi, setTitleVi] = useState(initialTitleVi);
  const [titleEn, setTitleEn] = useState(initialTitleEn);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [status, setStatus] = useState<LessonStatus>(initialStatus);
  const [reviewNote, setReviewNote] = useState<string | null>(initialReviewNote);
  const [publishChecked, setPublishChecked] = useState(initialStatus === 'published');
  const [rejectNote, setRejectNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const canEditContent = canReview
    ? status === 'draft' || status === 'published'
    : status === 'draft' || status === 'rejected';
  const canSubmitForReview = !canReview &&
    (status === 'draft' || status === 'rejected') &&
    Boolean(titleVi.trim() && titleEn.trim()) &&
    blocks.length > 0;

  const applyLesson = (lesson: { status: LessonStatus; review_note: string | null; updated_at: string }) => {
    setStatus(lesson.status);
    setReviewNote(lesson.review_note);
    setPublishChecked(lesson.status === 'published');
    setUpdatedAt(lesson.updated_at);
  };

  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const result = parseLessonImport(await file.text(), file.size);
    if (!result.ok) {
      setMessage({ text: t(result.error), type: 'error' });
      return;
    }

    const confirmed = window.confirm(t({
      en: `Replace all ${blocks.length} current blocks with ${result.blocks.length} imported blocks?`,
      vi: `Thay toàn bộ ${blocks.length} khối hiện có bằng ${result.blocks.length} khối từ tệp?`,
    }));
    if (!confirmed) return;

    setBlocks(result.blocks);
    if (result.title_en !== undefined) setTitleEn(result.title_en);
    if (result.title_vi !== undefined) setTitleVi(result.title_vi);
    setMessage({ text: t({ en: 'Imported. Remember to save.', vi: 'Đã nạp nội dung. Nhớ bấm lưu.' }), type: 'success' });
  };

  const handleAddBlock = (newBlock: Block) => {
    setBlocks((prev) => [...prev, newBlock]);
  };

  const handleRemoveBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const updated = [...blocks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setBlocks(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) {
        setMessage({ text: t({ en: 'Your session expired. Sign in again to save.', vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để lưu bài.' }), type: 'error' });
        return;
      }

      const res = await fetch(`${API_BASE}/api/authoring/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title_vi: titleVi,
          title_en: titleEn,
          blocks,
          expected_updated_at: updatedAt,
          ...(canReview ? { status: publishChecked ? 'published' : 'draft' } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const next = data.lesson.status as LessonStatus;
        applyLesson(data.lesson);
        setMessage({
          text: next === 'rejected'
            ? t({ en: 'Saved. The lesson still needs to be sent for review again.', vi: 'Đã lưu chỉnh sửa. Bài vẫn chờ bạn gửi lại admin duyệt.' })
            : next === 'draft'
              ? t({ en: 'Draft saved.', vi: 'Đã lưu bản nháp.' })
              : t({ en: 'Lesson saved.', vi: 'Đã lưu bài học.' }),
          type: 'success',
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({
          text: data.error ?? t({ en: 'Save failed. Check the server connection.', vi: 'Lưu thất bại. Kiểm tra kết nối máy chủ.' }),
          type: 'error',
        });
      }
    } catch {
      setMessage({
        text: t({ en: 'Cannot reach the server. Your changes were not saved.', vi: 'Không kết nối được máy chủ. Thay đổi chưa được lưu.' }),
        type: 'error',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleSubmitForReview = async () => {
    setSubmittingForReview(true);
    setMessage(null);
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) {
        setMessage({ text: t({ en: 'Your session expired. Sign in again to submit.', vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để gửi bài.' }), type: 'error' });
        return;
      }

      const res = await fetch(`${API_BASE}/api/authoring/lessons/${lessonId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title_vi: titleVi,
          title_en: titleEn,
          blocks,
          expected_updated_at: updatedAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ text: data.error ?? t({ en: 'Could not send the lesson for review.', vi: 'Không gửi được bài vào hàng chờ duyệt.' }), type: 'error' });
        return;
      }

      applyLesson(data.lesson);
      setMessage({ text: t({ en: 'Sent for admin review.', vi: 'Đã gửi bài vào hàng chờ admin duyệt.' }), type: 'success' });
    } catch {
      setMessage({ text: t({ en: 'Cannot reach the server. The lesson was not sent for review.', vi: 'Không kết nối được máy chủ. Bài chưa được gửi duyệt.' }), type: 'error' });
    } finally {
      setSubmittingForReview(false);
    }
  };

  const handleReview = async (decision: 'approve' | 'reject') => {
    setReviewing(true);
    setMessage(null);
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) {
        setMessage({ text: t({ en: 'Your session expired. Sign in again to review.', vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để duyệt bài.' }), type: 'error' });
        return;
      }

      const res = await fetch(`${API_BASE}/api/authoring/lessons/${lessonId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          decision,
          expected_updated_at: updatedAt,
          ...(decision === 'reject' && rejectNote.trim() ? { note: rejectNote.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ text: data.error ?? t({ en: 'Could not save the review decision.', vi: 'Không lưu được kết quả duyệt bài.' }), type: 'error' });
        return;
      }

      applyLesson(data.lesson);
      router.push('/admin/lessons/review');
      router.refresh();
    } catch {
      setMessage({ text: t({ en: 'Cannot reach the server. The review decision was not saved.', vi: 'Không kết nối được máy chủ. Kết quả duyệt chưa được lưu.' }), type: 'error' });
    } finally {
      setReviewing(false);
    }
  };

  const busy = saving || submittingForReview || reviewing;
  const level = levelOfGrade(grade);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <LessonStatusBadge status={status} />
            <span className="text-sm text-ink-muted">{t({ en: `Grade ${grade}`, vi: `Lớp ${grade}` })}</span>
          </div>
          <h1 className="text-xl font-semibold text-ink">
            {t({ en: 'Edit lesson', vi: 'Biên tập bài giảng' })}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canReview && (status === 'draft' || status === 'published') && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={publishChecked}
                onChange={(e) => setPublishChecked(e.target.checked)}
                className="h-5 w-5 accent-[var(--action)]"
              />
              <span>{t({ en: 'Publish to students', vi: 'Xuất bản cho học sinh' })}</span>
            </label>
          )}

          {canEditContent && (
            <Button type="button" variant={canSubmitForReview ? 'outline' : 'default'} onClick={handleSave} disabled={busy}>
              {saving
                ? t({ en: 'Saving…', vi: 'Đang lưu…' })
                : status === 'draft' && !canReview
                  ? t({ en: 'Save draft', vi: 'Lưu bản nháp' })
                  : t({ en: 'Save lesson', vi: 'Lưu bài giảng' })}
            </Button>
          )}
          {canSubmitForReview && (
            <Button type="button" onClick={handleSubmitForReview} disabled={busy}>
              {submittingForReview
                ? t({ en: 'Sending…', vi: 'Đang gửi…' })
                : status === 'rejected'
                  ? t({ en: 'Send for review again', vi: 'Gửi duyệt lại' })
                  : t({ en: 'Send for review', vi: 'Gửi admin duyệt' })}
            </Button>
          )}
        </div>
      </Card>

      {status === 'published' && !canReview && (
        <Alert tone="success">
          {t({ en: 'An admin approved this lesson. Published content cannot be edited by teachers.', vi: 'Bài đã được admin duyệt. Giáo viên không thể sửa nội dung đã xuất bản.' })}
        </Alert>
      )}

      {!canReview && status === 'pending_review' && (
        <Alert tone="warning" title={t({ en: 'Waiting for review', vi: 'Đang chờ duyệt' })}>
          {t({ en: 'Content is locked until an admin approves or returns the lesson.', vi: 'Nội dung được khóa cho đến khi admin duyệt hoặc trả lại bài.' })}
        </Alert>
      )}

      {!canReview && status === 'draft' && (
        <Alert tone="info">
          {t({ en: 'This lesson is a draft. Fill in both titles and add at least one block, then send it for review.', vi: 'Bài đang là bản nháp. Hoàn thiện tiêu đề và thêm ít nhất một khối, sau đó gửi admin duyệt.' })}
        </Alert>
      )}
      {!canReview && status === 'rejected' && (
        <Alert tone="danger" title={t({ en: 'Changes requested', vi: 'Cần chỉnh sửa' })}>
          {t({ en: 'Update the lesson before sending it for review again.', vi: 'Bài cần chỉnh sửa trước khi gửi admin duyệt lại.' })}
          {reviewNote && <span className="mt-1 block font-semibold">{t({ en: 'Admin note', vi: 'Ghi chú của admin' })}: {reviewNote}</span>}
        </Alert>
      )}

      {canReview && status === 'pending_review' && (
        <Card className="gap-4 px-5">
          <div>
            <h2 className="text-base font-semibold text-ink">{t({ en: 'This lesson is waiting for review', vi: 'Bài đang chờ admin duyệt' })}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t({ en: 'Check the preview, then approve it or ask for changes.', vi: 'Kiểm tra nội dung xem trước rồi chọn duyệt hoặc yêu cầu chỉnh sửa.' })}</p>
          </div>
          <Field id="review-note" label={t({ en: 'Note for the teacher (optional)', vi: 'Ghi chú cho giáo viên (không bắt buộc)' })}>
            {(control) => (
              <textarea
                {...control}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                maxLength={1000}
                rows={3}
                className="min-h-[5rem] w-full rounded-lg border border-edge bg-surface p-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" onClick={() => handleReview('reject')} disabled={reviewing || saving}>
              {reviewing ? t({ en: 'Working…', vi: 'Đang xử lý…' }) : t({ en: 'Ask for changes', vi: 'Yêu cầu chỉnh sửa' })}
            </Button>
            <Button type="button" onClick={() => handleReview('approve')} disabled={reviewing || saving}>
              {t({ en: 'Approve and publish', vi: 'Duyệt và xuất bản' })}
            </Button>
          </div>
        </Card>
      )}

      <div aria-live="polite">
        {message && <Alert tone={message.type === 'success' ? 'success' : 'danger'}>{message.text}</Alert>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="gap-4 px-5 sm:px-6">
            <h2 className="text-base font-semibold text-ink">{t({ en: 'Lesson titles', vi: 'Tiêu đề bài học' })}</h2>
            <Field id="lesson-title-vi" label={t({ en: 'Vietnamese title', vi: 'Tiêu đề tiếng Việt' })}>
              {(control) => (
                <Input {...control} value={titleVi} onChange={(e) => setTitleVi(e.target.value)} disabled={!canEditContent} placeholder="Ví dụ: Cấu trúc dữ liệu mảng" />
              )}
            </Field>
            <Field id="lesson-title-en" label={t({ en: 'English title', vi: 'Tiêu đề tiếng Anh' })}>
              {(control) => (
                <Input {...control} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} disabled={!canEditContent} placeholder="e.g. Array data structures" />
              )}
            </Field>
          </Card>

          {canEditContent && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => importInputRef.current?.click()}>
                  <FileUp aria-hidden="true" />
                  {t({ en: 'Import JSON', vi: 'Nhập từ JSON' })}
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={handleImportFile}
                />
              </div>
              <BlockPalette onAddBlock={handleAddBlock} />
            </div>
          )}

          <section className="flex flex-col gap-3" aria-labelledby="block-list-heading">
            <h2 id="block-list-heading" className="text-base font-semibold text-ink">
              {t({ en: 'Content blocks', vi: 'Khối nội dung' })} <span className="font-normal text-ink-muted">({blocks.length})</span>
            </h2>

            <ol className="flex flex-col gap-2">
              {blocks.map((b, idx) => (
                <li key={idx} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-sm font-semibold tabular-nums text-ink">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{t(BLOCK_TYPE_LABELS[b.type])}</p>
                      <p className="max-w-[14rem] truncate text-sm text-ink-muted sm:max-w-xs">
                        {b.type === 'theory'
                          ? b.content.vi.slice(0, 40) + '…'
                          : b.type === 'code'
                          ? b.tabs.map((tab) => tab.lang).join(', ')
                          : b.type === 'formula'
                          ? b.katex
                          : b.type}
                      </p>
                    </div>
                  </div>

                  {canEditContent && (
                    <div className="flex shrink-0 items-center">
                      <Button type="button" size="icon" variant="ghost" disabled={idx === 0} onClick={() => handleMoveBlock(idx, 'up')} aria-label={t({ en: `Move block ${idx + 1} up`, vi: `Đưa khối ${idx + 1} lên` })}>
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" disabled={idx === blocks.length - 1} onClick={() => handleMoveBlock(idx, 'down')} aria-label={t({ en: `Move block ${idx + 1} down`, vi: `Đưa khối ${idx + 1} xuống` })}>
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="text-danger" onClick={() => handleRemoveBlock(idx)} aria-label={t({ en: `Delete block ${idx + 1}`, vi: `Xóa khối ${idx + 1}` })}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="flex items-center gap-2 text-base font-semibold text-ink">
            <Eye className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            {t({ en: 'Student preview', vi: 'Xem trước như học sinh' })}
          </h2>

          <LevelScope level={level} className="rounded-xl bg-paper p-3 sm:p-4">
            <SubjectProvider slug={subjectSlug}>
              <LessonSheet squared={level === 'primary'}>
                <div className="flex flex-col gap-7">
                  <header className="border-b border-line pb-4">
                    <p className="text-2xl font-bold text-ink">
                      {lang === 'en' ? titleEn || titleVi : titleVi}
                    </p>
                    <p lang={lang === 'en' ? 'vi' : 'en'} className="mt-1 text-sm text-ink-muted">
                      {lang === 'en' ? titleVi : titleEn}
                    </p>
                  </header>

                  {blocks.length === 0 ? (
                    <EmptyState
                      title={t({ en: 'No content yet', vi: 'Chưa có nội dung' })}
                      description={t({ en: 'Add a block from the list on the left to start.', vi: 'Thêm khối ở cột bên trái để bắt đầu.' })}
                    />
                  ) : (
                    blocks.map((block, i) => <BlockRenderer key={i} block={block} />)
                  )}
                </div>
              </LessonSheet>
            </SubjectProvider>
          </LevelScope>
        </section>
      </div>
    </div>
  );
}
