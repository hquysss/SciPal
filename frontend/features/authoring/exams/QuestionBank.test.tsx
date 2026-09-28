import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { QuestionBank } from './QuestionBank';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const subjects = [{ id: 's1', slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', sort_order: 1, grades: [10, 11] }];

describe('QuestionBank', () => {
  it('offers five labelled filters and asks for a subject first', () => {
    const html = renderToStaticMarkup(<QuestionBank subjects={subjects} />);
    for (const label of ['Môn học', 'Lớp', 'Dạng câu', 'Mức độ', 'Trạng thái']) {
      expect(html).toMatch(new RegExp(`<label[^>]*>${label}</label>`));
    }
    expect(html).toContain('Chọn môn học để xem câu hỏi');
    expect(countRawColors(html).total).toBe(0);
  });
});
