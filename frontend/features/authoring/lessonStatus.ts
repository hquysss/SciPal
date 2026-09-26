// frontend/features/authoring/lessonStatus.ts
import type { LessonStatus } from '@scipal/supabase';

const LABELS: Record<LessonStatus, { en: string; vi: string }> = {
  draft: { en: 'Draft', vi: 'Bản nháp' },
  pending_review: { en: 'Awaiting review', vi: 'Chờ admin duyệt' },
  published: { en: 'Published', vi: 'Đã xuất bản' },
  rejected: { en: 'Changes requested', vi: 'Cần chỉnh sửa' },
};

const TONES: Record<LessonStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  draft: 'neutral',
  pending_review: 'warning',
  published: 'success',
  rejected: 'danger',
};

export const TONE_CLASS = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
} as const;

export function lessonStatusLabel(status: LessonStatus) {
  return LABELS[status];
}

export function lessonStatusTone(status: LessonStatus) {
  return TONES[status];
}
