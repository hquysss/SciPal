import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Block } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { BlockRenderer } from './BlockRenderer';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'vi', t: (o: { en: string; vi: string }) => o.vi }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  }),
}));

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
  it('points a lone quiz block to the Practice part without leaking the question id', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={blocks[0]} />);
    expect(html).toContain('phần Tự luyện');
    expect(html).not.toContain('sắp có');
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

  it('renders an image with its alt text and caption, lazily', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer
        block={{
          type: 'image',
          url: 'https://p.supabase.co/storage/v1/object/public/lesson-media/a.png',
          alt: { vi: 'Sơ đồ tế bào', en: 'Cell diagram' },
          caption: { vi: 'Hình 1', en: 'Figure 1' },
        }}
      />,
    );
    expect(html).toContain('alt="Sơ đồ tế bào"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('Hình 1');
    expect(countRawColors(html).total).toBe(0);
  });

  it('no longer links every resource to the same site', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={{ type: 'resource-ref', resource_id: '1c7a0d2b-8e3f-4a4b-9d6c-2f3e4d5c6b7a' }} />);
    expect(html).not.toContain('visualgo');
    expect(html).toContain('Tài nguyên học tập');
  });

  it('previews the other language when the editor asks for it', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={{ type: 'theory', content: { vi: 'Xin chào', en: 'Hello' } }} lang="en" />);
    expect(html).toContain('Hello');
    expect(html).not.toContain('Xin chào');
  });
});
