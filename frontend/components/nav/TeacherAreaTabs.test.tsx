import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { ExamManageTabs, TeacherAreaTabs } from './TeacherAreaTabs';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

describe('TeacherAreaTabs', () => {
  it('links the lesson areas; exams live under Thi thử', () => {
    const html = renderToStaticMarkup(<TeacherAreaTabs active="lessons" />);
    expect(html).toContain('href="/teacher/lessons"');
    expect(html).toContain('href="/teacher/simulation-requests"');
    expect(html).not.toContain('/exam/manage');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('ExamManageTabs', () => {
  it('switches between exams and the question bank', () => {
    const html = renderToStaticMarkup(<ExamManageTabs active="questions" />);
    expect(html).toContain('href="/exam/manage"');
    const current = html.match(/<a[^>]*aria-current="page"[^>]*>([^<]+)<\/a>/);
    expect(current?.[0]).toContain('href="/exam/manage/questions"');
    expect(current?.[1]).toBe('Ngân hàng câu hỏi');
  });
});
