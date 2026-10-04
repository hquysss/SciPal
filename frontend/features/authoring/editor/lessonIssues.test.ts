import { describe, expect, it } from 'vitest';
import type { Block } from '@scipal/types';
import { lessonIssues } from './lessonIssues';

describe('lessonIssues', () => {
  it('flags missing English, empty text, bad formulas and images without a description', () => {
    const blocks: Block[] = [
      { type: 'theory', content: { vi: 'Nội dung', en: '' } },
      { type: 'theory', content: { vi: ' ', en: ' ' } },
      { type: 'formula', katex: '\frac{1}{', caption: { vi: '', en: '' } },
      { type: 'image', url: 'https://x/lesson-media/a.png', alt: { vi: '', en: '' } },
    ];
    const issues = lessonIssues(blocks);
    expect(issues.map((i) => [i.part, i.index, i.blocking])).toEqual([
      ['lesson', 0, false],
      ['lesson', 1, true],
      ['lesson', 2, true],
      ['lesson', 3, true],
    ]);
    expect(issues[0]!.message.vi).toMatch(/tiếng Anh/);
  });

  it('counts indexes within each part', () => {
    const issues = lessonIssues([
      { type: 'interactive', kind: 'algorithm-sim', heading: { vi: 'S', en: '' }, offline: true, config: {} },
      { type: 'theory', content: { vi: 'A', en: '' } },
    ]);
    expect(issues.map((i) => [i.part, i.index])).toEqual([['lesson', 0], ['lesson', 1]]);
  });

  it('finds nothing wrong in a complete lesson', () => {
    expect(lessonIssues([{ type: 'theory', content: { vi: 'A', en: 'A' } }])).toEqual([]);
  });

  it('blocks simulations with bad settings or no Vietnamese heading', () => {
    const issues = lessonIssues([
      { type: 'interactive', kind: 'motion', heading: { vi: 'Ném', en: 'Throw' }, offline: true, config: { v0: 5000 } },
      { type: 'interactive', kind: 'embed', heading: { vi: 'Nhúng', en: 'Embed' }, offline: false, config: {} },
      { type: 'interactive', kind: 'probability', heading: { vi: '', en: '' }, offline: true, config: {} },
      { type: 'interactive', kind: 'geometry-3d', heading: { vi: 'Cũ', en: '' }, offline: false, config: {} },
    ]);
    expect(issues.map((i) => [i.index, i.blocking])).toEqual([[0, true], [1, true], [2, true], [3, false]]);
    expect(issues[0]!.message.vi).toMatch(/Vận tốc/);
  });

  describe('practice questions', () => {
    const Q = ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666666'];
    const quiz = Q.map((question_id) => ({ type: 'quiz' as const, question_id }));
    const mc = (data: Record<string, unknown>) => ({ id: '', type: 'mc', difficulty: 1, status: 'draft', mine: true, editable: true, data });
    const good = { stem: { vi: 'Câu?', en: 'Q?' }, options: [{ id: 'a', text: { vi: 'A', en: 'A' } }, { id: 'b', text: { vi: 'B', en: 'B' } }], answer: 'a' };

    it('points to the exact question that is incomplete, invalid or gone', () => {
      const rows = {
        [Q[0]!]: mc(good),
        [Q[1]!]: mc({ ...good, stem: { vi: 'Câu?', en: '' } }),
        [Q[2]!]: mc({ ...good, answer: 'z' }),
      };
      const issues = lessonIssues(quiz, rows as never);
      expect(issues.map((i) => [i.part, i.index, i.blocking])).toEqual([['practice', 1, false], ['practice', 2, true], ['practice', 3, true]]);
      expect(issues[0]!.message.vi).toMatch(/tiếng Anh/);
      expect(issues[2]!.message.vi).toMatch(/không tìm thấy/i);
    });

    it('accepts an imported short question whose key is stored as `answer`', () => {
      const imported = { id: '', type: 'short', difficulty: 1, status: 'draft', mine: true, editable: true, data: { stem: { vi: 'Câu?', en: 'Q?' }, answer: '42' } };
      expect(lessonIssues([quiz[0]!], { [Q[0]!]: imported } as never)).toEqual([]);
    });

    it('does not judge questions it has not loaded, or published ones it may not read', () => {
      expect(lessonIssues(quiz)).toEqual([]);
      const shared = { ...mc({ stem: { vi: 'Câu?', en: 'Q?' }, options: [] }), mine: false, editable: false, status: 'published' };
      expect(lessonIssues([quiz[0]!], { [Q[0]!]: shared } as never)).toEqual([]);
    });
  });
});

describe('lessonIssues fields and hints', () => {
  it('names the field at fault', () => {
    const issues = lessonIssues([
      { type: 'theory', content: { vi: 'A', en: '' } },
      { type: 'theory', content: { vi: '', en: '' } },
      { type: 'formula', katex: '' },
      { type: 'image', url: 'https://x/lesson-media/a.png', alt: { vi: '', en: '' } },
      { type: 'code', tabs: [{ lang: 'python', code: '' }] },
    ]);
    expect(issues.map((i) => i.field)).toEqual(['content.en', 'content.vi', 'katex', 'alt.vi', 'tabs']);
  });

  it('explains a formula error with what KaTeX says, without its prefix', () => {
    const [issue] = lessonIssues([{ type: 'formula', katex: '\frac{1}{' }]);
    expect(issue!.hint?.en).toBeTruthy();
    expect(issue!.hint?.en).not.toMatch(/KaTeX parse error/);
  });

  it('tells how to fill missing English', () => {
    const [issue] = lessonIssues([{ type: 'theory', content: { vi: 'A', en: '' } }]);
    expect(issue!.hint?.vi).toMatch(/Tự dịch/);
  });
});
