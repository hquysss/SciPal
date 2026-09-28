import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { ExamBuilder } from './ExamBuilder';
import type { ExamDetail } from './api';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => {}, refresh: () => {} }) }));

const subjects = [{ id: 's1', slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', sort_order: 1, grades: [10, 11] }];
const exam: ExamDetail = {
  id: 'e1', name: 'Đề 1', name_en: 'Exam 1', subject_id: 's1', subject_name_vi: 'Tin học', grade: 10, duration_minutes: 45,
  status: 'published', question_count: 0, updated_at: 't', created_by: 'teacher-1', imported: false, mine: true,
  question_ids: [], review_note: null, editable: false,
};

describe('ExamBuilder', () => {
  it('starts a new exam with its details and the admin-only publish choice', () => {
    const teacherHtml = renderToStaticMarkup(<ExamBuilder exam={null} subjects={subjects} isAdmin={false} />);
    expect(teacherHtml).toMatch(/<label[^>]*>Tên đề \(tiếng Việt\)<\/label>/);
    expect(teacherHtml).toMatch(/<label[^>]*>Thời gian \(phút\)<\/label>/);
    expect(teacherHtml).not.toContain('Xuất bản ngay');
    expect(renderToStaticMarkup(<ExamBuilder exam={null} subjects={subjects} isAdmin />)).toContain('Xuất bản ngay');
    expect(countRawColors(teacherHtml).total).toBe(0);
  });

  it('shows a published exam read-only to a teacher', () => {
    const html = renderToStaticMarkup(<ExamBuilder exam={exam} subjects={subjects} isAdmin={false} />);
    expect(html).not.toContain('Lưu đề');
    expect(html).toContain('không sửa được');
    expect(countRawColors(html).total).toBe(0);
  });

  it('shows why an exam was sent back', () => {
    const html = renderToStaticMarkup(<ExamBuilder exam={{ ...exam, status: 'draft', editable: true, review_note: 'Thêm câu khó' }} subjects={subjects} isAdmin={false} />);
    expect(html).toContain('Thêm câu khó');
    expect(html).toContain('Lưu đề');
  });

  it('offers "Xuất bản" only on an admin’s own draft', () => {
    const draft = { ...exam, status: 'draft' as const, editable: true };
    expect(renderToStaticMarkup(<ExamBuilder exam={draft} subjects={subjects} isAdmin />)).toContain('>Xuất bản<');
    expect(renderToStaticMarkup(<ExamBuilder exam={{ ...draft, mine: false }} subjects={subjects} isAdmin />)).not.toContain('>Xuất bản<');
  });

  it('offers "Xóa đề" on a saved draft', () => {
    const draft = { ...exam, status: 'draft' as const, editable: true };
    expect(renderToStaticMarkup(<ExamBuilder exam={draft} subjects={subjects} isAdmin={false} />)).toContain('Xóa đề');
    expect(renderToStaticMarkup(<ExamBuilder exam={null} subjects={subjects} isAdmin={false} />)).not.toContain('Xóa đề');
  });
});
