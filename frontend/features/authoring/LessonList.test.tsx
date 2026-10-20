// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LessonList, type LessonListItem } from './LessonList';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'vi', t: (copy: { vi: string }) => copy.vi }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }));

const lessons: LessonListItem[] = [
  {
    id: 'lesson-sort',
    subject_id: 'informatics',
    subject_slug: 'informatics',
    subject_name_en: 'Informatics',
    subject_name_vi: 'Tin học',
    topic_name_en: 'Programming techniques',
    topic_name_vi: 'Kĩ thuật lập trình',
    slug: 'simple-sorting',
    title_vi: 'Các thuật toán sắp xếp đơn giản',
    title_en: 'Simple sorting algorithms',
    grade: 11,
    status: 'published',
    published_at: '2026-10-16T00:00:00.000Z',
    delete_requested_at: null,
    updated_at: '2026-10-16T00:00:00.000Z',
    block_count: 27,
  },
  {
    id: 'lesson-history',
    subject_id: 'history',
    subject_slug: 'history',
    subject_name_en: 'History',
    subject_name_vi: 'Lịch sử',
    topic_name_en: 'National defence',
    topic_name_vi: 'Bảo vệ Tổ quốc',
    slug: 'resistance-wars',
    title_vi: 'Các cuộc kháng chiến bảo vệ Tổ quốc',
    title_en: 'Wars of national defence',
    grade: 11,
    status: 'draft',
    published_at: null,
    delete_requested_at: null,
    updated_at: '2026-10-15T00:00:00.000Z',
    block_count: 18,
  },
  {
    id: 'lesson-network',
    subject_id: 'informatics',
    subject_slug: 'informatics',
    subject_name_en: 'Informatics',
    subject_name_vi: 'Tin học',
    topic_name_en: 'Computer networks',
    topic_name_vi: 'Mạng máy tính',
    slug: 'network-basics',
    title_vi: 'Nhập môn mạng máy tính',
    title_en: 'Introduction to computer networks',
    grade: 10,
    status: 'pending_review',
    published_at: null,
    delete_requested_at: null,
    updated_at: '2026-10-14T00:00:00.000Z',
    block_count: 12,
  },
];

afterEach(cleanup);

describe('LessonList filters', () => {
  it('finds Vietnamese lesson titles when the search text omits diacritics', () => {
    render(<LessonList lessons={lessons} role="admin" />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm bài giảng' }), {
      target: { value: 'sap xep' },
    });

    expect(screen.getByText('Các thuật toán sắp xếp đơn giản')).toBeTruthy();
    expect(screen.queryByText('Các cuộc kháng chiến bảo vệ Tổ quốc')).toBeNull();
    expect(screen.getByText('Đang xem 1/3 bài')).toBeTruthy();
  });

  it('combines subject, grade and status filters, then clears all filters', () => {
    render(<LessonList lessons={lessons} role="admin" />);

    fireEvent.change(screen.getByLabelText('Môn học'), { target: { value: 'informatics' } });
    fireEvent.change(screen.getByLabelText('Lớp'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'pending_review' } });

    expect(screen.getByText('Nhập môn mạng máy tính')).toBeTruthy();
    expect(screen.queryByText('Các thuật toán sắp xếp đơn giản')).toBeNull();
    expect(screen.getByText('Đang xem 1/3 bài')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));

    expect(screen.getByText('Các thuật toán sắp xếp đơn giản')).toBeTruthy();
    expect(screen.getByText('Các cuộc kháng chiến bảo vệ Tổ quốc')).toBeTruthy();
    expect(screen.getByText('Nhập môn mạng máy tính')).toBeTruthy();
    expect(screen.getByText('Đang xem 3/3 bài')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Xóa bộ lọc' })).toBeNull();
  });

  it('shows a useful empty state when no lesson matches', () => {
    render(<LessonList lessons={lessons} role="teacher" />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm bài giảng' }), {
      target: { value: 'không tồn tại' },
    });

    expect(screen.getByText('Không tìm thấy bài giảng phù hợp')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeTruthy();
  });
});
