import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { QuestionPicker } from './QuestionPicker';

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
