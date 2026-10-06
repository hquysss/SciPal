import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { ExamTable } from './ExamList';
import type { ExamSummary } from './api';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const exam = (patch: Partial<ExamSummary> = {}): ExamSummary => ({
  id: 'e1', name: 'Đề giữa kỳ', name_en: 'Midterm', subject_id: 's1', subject_name_vi: 'Tin học', grade: 10, duration_minutes: 45,
  status: 'draft', question_count: 12, updated_at: '2026-09-27T00:00:00Z', created_by: 'teacher-1', imported: false, mine: true,
  ...patch,
});

describe('ExamTable', () => {
  it('lists each exam with subject, grade, questions, time and status, linking to the builder', () => {
    const html = renderToStaticMarkup(<ExamTable exams={[exam(), exam({ id: 'e2', name: 'Đề Excel', imported: true, status: 'published', source: 'Sở GD&ĐT 2026' })]} />);
    expect(html).toContain('href="/exam/manage/e1"');
    expect(html).toContain('Đề giữa kỳ');
    expect(html).toContain('Tin học · Lớp 10');
    expect(html).toContain('12 câu');
    expect(html).toContain('45 phút');
    expect(html).toContain('Nhập từ Excel');
    expect(html).toContain('Nguồn: Sở GD&amp;ĐT 2026');
    expect(html).toContain('Bản nháp');
    expect(countRawColors(html).total).toBe(0);
  });

  it('explains an empty list', () => {
    expect(renderToStaticMarkup(<ExamTable exams={[]} />)).toContain('Chưa có đề thi');
  });
});
