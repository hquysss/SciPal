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
    expect(issues.map((i) => [i.part, i.index])).toEqual([['lesson', 0], ['simulation', 0]]);
  });

  it('finds nothing wrong in a complete lesson', () => {
    expect(lessonIssues([{ type: 'theory', content: { vi: 'A', en: 'A' } }])).toEqual([]);
  });
});
