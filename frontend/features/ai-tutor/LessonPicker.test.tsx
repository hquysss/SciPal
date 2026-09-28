import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LessonPicker } from './LessonPicker';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

const lessons = [
  { id: 'l1', title_vi: 'Vòng lặp', title_en: 'Loops', grade: 10, subject_id: 's1', subject_name_vi: 'Tin học', subject_name_en: 'Informatics' },
  { id: 'l2', title_vi: 'Dao động', title_en: 'Oscillation', grade: 11, subject_id: 's2', subject_name_vi: 'Vật lí', subject_name_en: 'Physics' },
];

describe('LessonPicker', () => {
  it('lists subjects, and the lessons of the chosen lesson’s subject', () => {
    const html = renderToStaticMarkup(<LessonPicker lessons={lessons} value="l1" onChange={() => {}} />);
    expect(html).toMatch(/<label[^>]*>Môn<\/label>/);
    expect(html).toContain('Vật lí');
    expect(html).toContain('Vòng lặp');
    expect(html).not.toContain('Dao động');
    expect(html).toContain('Không chọn bài');
  });

  it('renders nothing when there are no published lessons', () => {
    expect(renderToStaticMarkup(<LessonPicker lessons={[]} value={null} onChange={() => {}} />)).toBe('');
  });
});
