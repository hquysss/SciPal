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

export function lessonStatusLabel(status: LessonStatus) {
  return LABELS[status];
}

export function lessonStatusTone(status: LessonStatus) {
  return TONES[status];
}
