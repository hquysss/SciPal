import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Block } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { LessonPartsView } from './LessonPartsView';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const theory: Block = { type: 'theory', content: { vi: 'Nội dung', en: 'Content' } };
const quiz: Block = { type: 'quiz', question_id: '11111111-1111-4111-8111-111111111111' };

describe('LessonPartsView', () => {
  it('shows tabs only for parts that have blocks, starting with the first', () => {
    const html = renderToStaticMarkup(<LessonPartsView blocks={[quiz, theory]} completion={<button>Hoàn thành</button>} />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Bài học');
    expect(html).toContain('Tự luyện');
    expect(html).not.toContain('Mô phỏng');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toContain('Nội dung');
    expect(html).toContain('Tiếp theo');
    expect(html).not.toContain('Hoàn thành'); // only at the end of the last part
    expect(countRawColors(html).total).toBe(0);
  });

  it('shows no tabs when the lesson has one part, and the completion button right away', () => {
    const html = renderToStaticMarkup(<LessonPartsView blocks={[theory]} completion={<button>Hoàn thành</button>} />);
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain('Hoàn thành');
  });

  it('previews one part without tabs or completion', () => {
    const html = renderToStaticMarkup(<LessonPartsView blocks={[quiz, theory]} part="practice" completion={<button>Hoàn thành</button>} />);
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('Nội dung');
    expect(html).not.toContain('Hoàn thành');
  });
});

describe('LessonPartsView on the learner page', () => {
  it('puts the blocks on the notebook sheet and keeps the tabs outside it', () => {
    const html = renderToStaticMarkup(<LessonPartsView blocks={[quiz, theory]} sheet={{ squared: false }} />);
    expect(html.indexOf('role="tablist"')).toBeLessThan(html.indexOf('<article'));
    expect(html).toContain('data-paper="ruled"');
  });
});
