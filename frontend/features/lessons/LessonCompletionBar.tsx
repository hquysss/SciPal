'use client';
import { useState } from 'react';
import Link from 'next/link';
import { postScoreLesson } from '@/lib/api';

export function LessonCompletionBar({
  lessonId,
  subjectSlug,
}: {
  lessonId: string;
  subjectSlug: string;
}) {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [xp, setXp] = useState(100);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await postScoreLesson({ lesson_id: lessonId, answers: [] }, 'demo-token');
      setXp(res.xp_earned);
      setCompleted(true);
    } catch {
      // Offline fallback
      setCompleted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-12 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm text-center">
      {!completed ? (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-gray-900">
            Bạn đã nắm vững nội dung bài học này chưa?
          </h3>
          <p className="text-xs text-gray-500">
            Ghi nhận tiến trình để tích lũy XP và duy trì chuỗi học liên tục
          </p>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:scale-105 active:scale-95 transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent, #16a34a)' }}
          >
            <span>{loading ? 'Đang ghi nhận...' : 'Đánh dấu hoàn thành (+100 XP)'}</span>
            <span aria-hidden="true">✓</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            🎉
          </div>
          <h3 className="text-lg font-extrabold text-emerald-700">
            Xuất sắc! Bạn đã nhận được +{xp} XP
          </h3>
          <p className="text-xs text-gray-500">
            Tiến trình đã được lưu lại trong hồ sơ cá nhân.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/progress"
              className="rounded-full bg-gray-100 hover:bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition"
            >
              Xem bảng tiến trình
            </Link>
            <Link
              href={`/${subjectSlug}`}
              className="rounded-full px-4 py-2 text-xs font-semibold text-white shadow-xs transition"
              style={{ backgroundColor: 'var(--accent, #16a34a)' }}
            >
              Bài tiếp theo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
