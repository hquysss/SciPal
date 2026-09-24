'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@scipal/supabase';
import type { Block } from '@scipal/types';
import { BlockPalette } from './BlockPalette';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { useLanguage } from '@scipal/hooks';
import type { LessonReviewStatus } from './authoringQueries';

interface LessonEditorProps {
  lessonId: string;
  initialTitleVi: string;
  initialTitleEn?: string;
  initialBlocks: Block[];
  initialPublished: boolean;
  initialUpdatedAt: string;
  reviewStatus: LessonReviewStatus;
  canReview: boolean;
}

export function LessonEditor({
  lessonId,
  initialTitleVi,
  initialTitleEn = '',
  initialBlocks,
  initialPublished,
  initialUpdatedAt,
  reviewStatus: initialReviewStatus,
  canReview,
}: LessonEditorProps) {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [titleVi, setTitleVi] = useState(initialTitleVi);
  const [titleEn, setTitleEn] = useState(initialTitleEn);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [published, setPublished] = useState(initialPublished);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [reviewStatus, setReviewStatus] = useState(initialReviewStatus);
  const [saving, setSaving] = useState(false);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const canEditContent = canReview
    ? reviewStatus === 'approved'
    : reviewStatus === 'draft' || reviewStatus === 'rejected';
  const canSubmitForReview = !canReview &&
    (reviewStatus === 'draft' || reviewStatus === 'rejected') &&
    Boolean(titleVi.trim() && titleEn.trim()) &&
    blocks.length > 0;

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
        setMessage({ text: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để lưu bài.', type: 'error' });
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
          ...(canReview && reviewStatus === 'approved' ? { published } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const nextReviewStatus = data.lesson.review_status as LessonReviewStatus;
        setReviewStatus(nextReviewStatus);
        setPublished(data.lesson.published);
        setUpdatedAt(data.lesson.updated_at);
        setMessage({
          text: nextReviewStatus === 'pending'
            ? 'Đã lưu. Bài học vẫn đang chờ admin duyệt.'
            : nextReviewStatus === 'rejected'
              ? 'Đã lưu chỉnh sửa. Bài vẫn chờ bạn gửi lại admin duyệt.'
              : nextReviewStatus === 'draft'
                ? 'Đã lưu bản nháp.'
                : 'Đã lưu thay đổi bài học thành công! 🎉',
          type: 'success',
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({
          text: data.error ?? 'Lưu thất bại. Kiểm tra kết nối máy chủ.',
          type: 'error',
        });
      }
    } catch {
      setMessage({
        text: 'Không kết nối được máy chủ. Thay đổi chưa được lưu.',
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
        setMessage({ text: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để gửi bài.', type: 'error' });
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
        setMessage({ text: data.error ?? 'Không gửi được bài vào hàng chờ duyệt.', type: 'error' });
        return;
      }

      setReviewStatus(data.lesson.review_status as LessonReviewStatus);
      setPublished(data.lesson.published);
      setUpdatedAt(data.lesson.updated_at);
      setMessage({ text: 'Đã gửi bài vào hàng chờ admin duyệt.', type: 'success' });
    } catch {
      setMessage({ text: 'Không kết nối được máy chủ. Bài chưa được gửi duyệt.', type: 'error' });
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
        setMessage({ text: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để duyệt bài.', type: 'error' });
        return;
      }

      const res = await fetch(`${API_BASE}/api/authoring/lessons/${lessonId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ decision, expected_updated_at: updatedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ text: data.error ?? 'Không lưu được kết quả duyệt bài.', type: 'error' });
        return;
      }

      setReviewStatus(data.lesson.review_status);
      setPublished(data.lesson.published);
      setUpdatedAt(data.lesson.updated_at);
      router.push('/admin/lessons/review');
      router.refresh();
    } catch {
      setMessage({ text: 'Không kết nối được máy chủ. Kết quả duyệt chưa được lưu.', type: 'error' });
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-purple-200/80 bg-white/90 p-5 sm:p-6 shadow-xs backdrop-blur-md dark:border-purple-900/40 dark:bg-card/90">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
              S10 Authoring Studio
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                published
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : reviewStatus === 'rejected'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {published
                ? '● Đã duyệt & xuất bản'
                : reviewStatus === 'pending'
                  ? '◷ Chờ admin duyệt'
                  : reviewStatus === 'rejected'
                    ? '○ Cần chỉnh sửa'
                    : reviewStatus === 'draft'
                      ? '○ Bản nháp'
                      : '● Đã duyệt · Bản nháp'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Biên tập & Thiết kế bài giảng
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canReview && reviewStatus === 'approved' && (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-4 w-4 rounded-sm border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span>Xuất bản cho học sinh</span>
            </label>
          )}

          {canEditContent && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || submittingForReview || reviewing}
              className="rounded-xl bg-purple-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-purple-800 active:scale-95 disabled:opacity-50"
            >
              {saving
                ? 'Đang lưu...'
                : reviewStatus === 'draft' && !canReview
                  ? 'Lưu bản nháp'
                  : 'Lưu bài giảng'}
            </button>
          )}
          {canSubmitForReview && (
            <button
              type="button"
              onClick={handleSubmitForReview}
              disabled={saving || submittingForReview || reviewing}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingForReview
                ? 'Đang gửi...'
                : reviewStatus === 'rejected'
                  ? 'Gửi duyệt lại'
                  : 'Gửi admin duyệt'}
            </button>
          )}
        </div>
      </div>

      {reviewStatus === 'approved' && !canReview && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          Bài đã được admin duyệt. Giáo viên không thể sửa nội dung đã xuất bản.
        </p>
      )}

      {!canReview && reviewStatus === 'pending' && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Bài đã gửi admin duyệt. Nội dung được khóa cho đến khi admin duyệt hoặc từ chối.
        </p>
      )}

      {!canReview && reviewStatus === 'draft' && (
        <p className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Bài đang là bản nháp. Hoàn thiện tiêu đề và thêm ít nhất một khối, sau đó gửi admin duyệt.
        </p>
      )}
      {!canReview && reviewStatus === 'rejected' && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Bài cần chỉnh sửa trước khi gửi admin duyệt lại.
        </p>
      )}

      {canReview && reviewStatus === 'pending' && (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">Bài đang chờ admin duyệt</h3>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">Kiểm tra nội dung xem trước rồi chọn duyệt hoặc yêu cầu chỉnh sửa.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleReview('reject')}
              disabled={reviewing || saving}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-card dark:text-red-300"
            >
              {reviewing ? 'Đang xử lý...' : 'Từ chối'}
            </button>
            <button
              type="button"
              onClick={() => handleReview('approve')}
              disabled={reviewing || saving}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Duyệt và xuất bản
            </button>
          </div>
        </section>
      )}

      {message && (
        <div
          className={`rounded-2xl p-4 text-xs font-bold shadow-xs ${
            message.type === 'success'
              ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Studio 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Authoring Controls */}
        <div className="space-y-6">
          {/* Title Metadata Card */}
          <div className="rounded-3xl border border-gray-200/80 bg-white/90 p-5 sm:p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-card/90 space-y-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Tiêu đề bài học song ngữ
            </h3>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tiêu đề Tiếng Việt (VI)
              </label>
              <input
                type="text"
                value={titleVi}
                onChange={(e) => setTitleVi(e.target.value)}
                disabled={!canEditContent}
                placeholder="Ví dụ: Cấu trúc dữ liệu mảng"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm font-medium outline-none focus:border-purple-600 focus:bg-white transition dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tiêu đề Tiếng Anh (EN)
              </label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                disabled={!canEditContent}
                placeholder="e.g. Array Data Structures"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm font-medium outline-none focus:border-purple-600 focus:bg-white transition dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Block Palette */}
          {canEditContent && <BlockPalette onAddBlock={handleAddBlock} />}

          {/* Block Outline & Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Danh sách khối nội dung ({blocks.length})
              </h3>
              <span className="text-xs text-gray-400">Kéo hoặc sắp xếp thứ tự</span>
            </div>

            {blocks.map((b, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs transition hover:border-purple-300 dark:border-gray-800 dark:bg-card"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 font-mono text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-mono text-xs font-bold uppercase text-purple-700 dark:text-purple-300">
                      {b.type}
                    </span>
                    <p className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-xs">
                      {b.type === 'theory'
                        ? b.content.vi.slice(0, 40) + '...'
                        : b.type === 'code'
                        ? `Tabs: ${b.tabs.map((t) => t.lang).join(', ')}`
                        : b.type === 'formula'
                        ? b.katex
                        : `ID: ${b.type}`}
                    </p>
                  </div>
                </div>

                {canEditContent && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveBlock(idx, 'up')}
                      className="h-7 w-7 rounded-lg text-xs font-bold text-gray-500 transition hover:bg-gray-100 disabled:opacity-20"
                      title="Lên trên"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={idx === blocks.length - 1}
                      onClick={() => handleMoveBlock(idx, 'down')}
                      className="h-7 w-7 rounded-lg text-xs font-bold text-gray-500 transition hover:bg-gray-100 disabled:opacity-20"
                      title="Xuống dưới"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(idx)}
                      className="h-7 w-7 rounded-lg text-xs font-bold text-red-500 transition hover:bg-red-50"
                      title="Xóa khối"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live Interactive Student Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              👁️ Xem trước tương tác (Học sinh sẽ thấy)
            </h3>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Trực quan thời gian thực
            </span>
          </div>

          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white/70 p-6 shadow-inner backdrop-blur-xs dark:border-gray-800 dark:bg-card/70 space-y-6 min-h-[500px]">
            <div className="border-b border-gray-100 pb-4 dark:border-gray-800">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {lang === 'en' ? titleEn || titleVi : titleVi}
              </h1>
              <p className="mt-1 text-xs font-mono text-gray-400">
                {lang === 'en' ? titleVi : titleEn}
              </p>
            </div>

            {blocks.length === 0 ? (
              <div className="py-16 text-center text-xs font-mono text-gray-400">
                Chưa có khối nội dung nào. Thêm khối ở bảng bên trái để bắt đầu!
              </div>
            ) : (
              blocks.map((block, i) => <BlockRenderer key={i} block={block} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
