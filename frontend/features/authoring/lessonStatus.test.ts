// frontend/features/authoring/lessonStatus.test.ts
import { describe, expect, it } from 'vitest';
import { lessonStatusLabel, lessonStatusTone } from './lessonStatus';

describe('lesson status presentation', () => {
  it.each([
    ['draft', 'Bản nháp', 'Draft', 'neutral'],
    ['pending_review', 'Chờ admin duyệt', 'Awaiting review', 'warning'],
    ['published', 'Đã xuất bản', 'Published', 'success'],
    ['rejected', 'Cần chỉnh sửa', 'Changes requested', 'danger'],
  ] as const)('%s', (status, vi, en, tone) => {
    expect(lessonStatusLabel(status)).toEqual({ en, vi });
    expect(lessonStatusTone(status)).toBe(tone);
  });
});
