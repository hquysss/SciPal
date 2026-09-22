'use client';

import { useState } from 'react';
import type { Block } from '@scipal/types';
import { BlockPalette } from './BlockPalette';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { useLanguage } from '@scipal/hooks';

interface LessonEditorProps {
  lessonId: string;
  initialTitleVi: string;
  initialTitleEn?: string;
  initialBlocks: Block[];
  initialPublished: boolean;
  token?: string;
}

export function LessonEditor({
  lessonId,
  initialTitleVi,
  initialTitleEn = '',
  initialBlocks,
  initialPublished,
  token,
}: LessonEditorProps) {
  const { lang, t } = useLanguage();
  const [titleVi, setTitleVi] = useState(initialTitleVi);
  const [titleEn, setTitleEn] = useState(initialTitleEn);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [published, setPublished] = useState(initialPublished);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

    try {
      const res = await fetch(`${API_BASE}/api/authoring/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title_vi: titleVi,
          title_en: titleEn,
          blocks,
          published,
        }),
      });

      if (res.ok) {
        setMessage({ text: 'Đã lưu thay đổi bài học thành công! 🎉', type: 'success' });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({
          text: data.error ?? 'Lưu thất bại. Kiểm tra kết nối máy chủ.',
          type: 'error',
        });
      }
    } catch (err) {
      console.warn('Authoring save error, keeping in local state:', err);
      setMessage({
        text: 'Đã lưu tạm vào phiên làm việc hiện tại (Offline preview mode)',
        type: 'success',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-purple-200/80 bg-white/90 p-5 sm:p-6 shadow-xs backdrop-blur-md dark:border-purple-900/40 dark:bg-card/90">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
              S10 Authoring Studio
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                published
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {published ? '● Đã xuất bản' : '○ Bản nháp'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Biên tập & Thiết kế bài giảng
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 rounded-sm border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span>Xuất bản cho học sinh</span>
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-purple-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-800 active:scale-95 transition disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu bài giảng'}
          </button>
        </div>
      </div>

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
                placeholder="Ví dụ: Thuật toán Tìm kiếm nhị phân"
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
                placeholder="e.g. Binary Search Algorithm"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm font-medium outline-none focus:border-purple-600 focus:bg-white transition dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Block Palette */}
          <BlockPalette onAddBlock={handleAddBlock} />

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

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveBlock(idx, 'up')}
                    className="h-7 w-7 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-20 transition"
                    title="Lên trên"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={idx === blocks.length - 1}
                    onClick={() => handleMoveBlock(idx, 'down')}
                    className="h-7 w-7 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-20 transition"
                    title="Xuống dưới"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(idx)}
                    className="h-7 w-7 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 transition"
                    title="Xóa khối"
                  >
                    ✕
                  </button>
                </div>
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
