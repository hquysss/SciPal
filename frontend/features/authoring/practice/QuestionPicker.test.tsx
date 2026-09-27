import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { QuestionPicker, withPage } from './QuestionPicker';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

describe('QuestionPicker', () => {
  it('searches published questions of the subject by their text', () => {
    const html = renderToStaticMarkup(<QuestionPicker subjectId="s" excludeIds={[]} onPick={() => {}} onCancel={() => {}} />);
    expect(html).toMatch(/<label[^>]*>[^<]*Tìm câu hỏi đã duyệt/);
    expect(html).toContain('type="search"');
    expect(html).toContain('Hủy');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('withPage', () => {
  const row = (id: string) => ({ id, type: 'mc', difficulty: 1, status: 'published', mine: false, editable: false, data: {} }) as never;
  const page = (ids: string[], n: number, total: number) => ({ questions: ids.map(row), page: n, page_size: 2, total });

  it('adds the next page after the loaded rows and knows when more remain', () => {
    const first = withPage([], page(['a', 'b'], 1, 5));
    expect(first).toEqual({ rows: [row('a'), row('b')], more: true });
    const second = withPage(first.rows, page(['c', 'd'], 2, 5));
    expect(second.rows.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(second.more).toBe(true);
    expect(withPage(second.rows, page(['e'], 3, 5)).more).toBe(false);
  });

  it('skips a row seen on an earlier page (new questions shift the pages)', () => {
    expect(withPage([row('a'), row('b')], page(['b', 'c'], 2, 4)).rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});
