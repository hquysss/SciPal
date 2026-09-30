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

  it('keeps simulations on the Bài học page, with Tự luyện as the only other tab', () => {
    const sim = { type: 'interactive', kind: 'algorithm-sim', heading: { vi: 'Mô phỏng tìm kiếm', en: 'Search sim' }, offline: true, config: {} } as unknown as Block;
    const html = renderToStaticMarkup(<LessonPartsView blocks={[theory, sim, quiz]} completion={<button>Hoàn thành</button>} />);
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain('Nội dung');
    expect(html).toContain('Tiếp theo: Tự luyện');
    expect(html).not.toMatch(/role="tab"[^>]*>[\s\S]*?Mô phỏng<\/button>/);
  });

  it('shows no tabs for theory and simulations alone', () => {
    const sim = { type: 'interactive', kind: 'algorithm-sim', heading: { vi: 'S', en: 'S' }, offline: true, config: {} } as unknown as Block;
    const html = renderToStaticMarkup(<LessonPartsView blocks={[theory, sim]} completion={<button>Hoàn thành</button>} />);
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain('Hoàn thành');
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

describe('LessonPartsView practice', () => {
  const practice = { ok: true as const, questions: [{ id: quiz.type === 'quiz' ? quiz.question_id : '', type: 'short' as const, difficulty: 1, data: { stem: { vi: 'Thủ đô Việt Nam?', en: 'Capital?' } } }] };

  it('asks the practice questions in the Tự luyện part, then offers completion', () => {
    const html = renderToStaticMarkup(<LessonPartsView blocks={[quiz]} practice={practice} completion={<button>Hoàn thành</button>} />);
    expect(html).toContain('Thủ đô Việt Nam?');
    expect(html).not.toContain('sắp có');
    expect(html.indexOf('Thủ đô Việt Nam?')).toBeLessThan(html.indexOf('Hoàn thành'));
  });

  it('previews practice questions in the editor', () => {
    const html = renderToStaticMarkup(<LessonPartsView blocks={[quiz, theory]} part="practice" practice={practice} lang="en" />);
    expect(html).toContain('Capital?');
  });
});
