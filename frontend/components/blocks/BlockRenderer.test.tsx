import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Block } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { BlockRenderer } from './BlockRenderer';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'vi', t: (o: { en: string; vi: string }) => o.vi }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const QUESTION_ID = '5f0c2f7e-2a39-4a8e-9b1b-3a7f0d6c1e11';

const blocks: Block[] = [
  { type: 'quiz', question_id: QUESTION_ID },
  { type: 'formula', katex: 'a^2+b^2=c^2', caption: { en: 'Pythagoras', vi: 'Định lí Pythagoras' } },
  { type: 'code', tabs: [{ lang: 'python', code: 'print(1)' }] },
  { type: 'term-ref', term_id: '0b6f9c1a-7d2e-4f3a-8c5b-1e2d3c4b5a69' },
  { type: 'resource-ref', resource_id: '1c7a0d2b-8e3f-4a4b-9d6c-2f3e4d5c6b7a' },
  {
    type: 'interactive',
    kind: 'algorithm-sim',
    heading: { en: 'Binary search', vi: 'Tìm kiếm nhị phân' },
    offline: true,
    config: {},
  } as Block,
];

describe('BlockRenderer', () => {
  it('shows the practice quiz as coming soon without leaking the question id', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={blocks[0]} />);
    expect(html).toContain('Câu hỏi luyện tập sắp có');
    expect(html).not.toContain(QUESTION_ID);
    expect(html).toContain('role="note"');
  });

  it.each(blocks.map((block) => [block.type, block] as const))('%s uses tokens only', (_type, block) => {
    const html = renderToStaticMarkup(<BlockRenderer block={block} />);
    expect(countRawColors(html).total).toBe(0);
    expect(html).not.toContain('uppercase');
  });

  it('scrolls a wide formula inside its own box', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={blocks[1]} />);
    expect(html).toMatch(/<div class="overflow-x-auto"><span class="katex-display"/);
  });

  it('gives code tabs a 44px target and marks the active tab', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer block={{ type: 'code', tabs: [{ lang: 'python', code: 'x' }, { lang: 'cpp', code: 'y' }] }} />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/aria-selected="true"[^>]*>python|>python<\/button>/);
    expect(html).toContain('min-h-11');
  });
});
