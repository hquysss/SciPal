import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { TeacherAreaTabs } from './TeacherAreaTabs';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

describe('TeacherAreaTabs', () => {
  it('links the three teacher areas and marks the current one', () => {
    const html = renderToStaticMarkup(<TeacherAreaTabs active="exams" />);
    expect(html).toContain('href="/teacher/lessons"');
    expect(html).toContain('href="/teacher/exams"');
    expect(html).toContain('href="/teacher/simulation-requests"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>Đề thi<\/a>|<a[^>]*href="\/teacher\/exams"[^>]*aria-current="page"/);
    expect(countRawColors(html).total).toBe(0);
  });
});
