import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { ExamReviewCard } from './ExamReview';
import type { ExamSummary } from './api';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const exam: ExamSummary = {
  id: 'e1', name: 'Đề cuối kỳ', name_en: 'Final', subject_id: 's1', subject_name_vi: 'Tin học', grade: 11, duration_minutes: 60,
  status: 'pending_review', question_count: 30, updated_at: '2026-09-27T00:00:00Z', created_by: 'teacher-1', imported: false, mine: false,
};

describe('ExamReviewCard', () => {
  it('shows the exam and the admin’s approve and send-back actions', () => {
    const html = renderToStaticMarkup(<ExamReviewCard exam={exam} onDone={() => {}} />);
    expect(html).toContain('Đề cuối kỳ');
    expect(html).toContain('Tin học · Lớp 11 · 30 câu · 60 phút');
    expect(html).toContain('href="/exam/manage/e1"');
    expect(html).toContain('Duyệt');
    expect(html).toContain('Trả lại');
    expect(countRawColors(html).total).toBe(0);
  });
});
