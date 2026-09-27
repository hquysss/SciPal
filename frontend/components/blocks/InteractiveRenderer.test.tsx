import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { InteractiveBlock } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { InteractiveRenderer } from './InteractiveRenderer';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const block = (patch: Partial<InteractiveBlock>): InteractiveBlock => ({
  type: 'interactive',
  kind: 'algorithm-sim',
  heading: { vi: 'Sắp xếp nổi bọt', en: 'Bubble sort' },
  offline: true,
  config: {},
  ...patch,
});

describe('InteractiveRenderer', () => {
  it('runs a built-in template from a stored config, filling defaults', () => {
    const html = renderToStaticMarkup(<InteractiveRenderer block={block({ config: { speed: 1 } })} />);
    expect(html).toContain('Sắp xếp nổi bọt');
    expect(html).toContain('aria-label="Bước tiếp"');
    expect(countRawColors(html).total).toBe(0);
  });

  it('follows the language asked for by the editor preview', () => {
    const html = renderToStaticMarkup(<InteractiveRenderer block={block({})} lang="en" />);
    expect(html).toContain('Bubble sort');
    expect(html).toContain('aria-label="Next step"');
  });

  it('explains a config it cannot run instead of crashing', () => {
    const html = renderToStaticMarkup(<InteractiveRenderer block={block({ config: { algorithm: 'quick-sort' } })} />);
    expect(html).toContain('Không mở được mô phỏng này');
  });

  it('keeps the placeholder for older kinds', () => {
    const html = renderToStaticMarkup(<InteractiveRenderer block={block({ kind: 'geometry-3d', config: { any: 1 } })} />);
    expect(html).toContain('Sắp xếp nổi bọt');
    expect(html).toContain('chưa có mô phỏng chạy được');
  });

  it('embeds an approved page in a sandbox, lazily, with a link out', () => {
    const url = 'https://www.desmos.com/calculator/abc';
    const html = renderToStaticMarkup(<InteractiveRenderer block={block({ kind: 'embed', offline: false, embed_url: url })} />);
    expect(html).toContain(`src="${url}"`);
    expect(html).toContain('sandbox="allow-scripts allow-same-origin"');
    expect(html).toMatch(/referrerpolicy="no-referrer"/i);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('target="_blank"');
  });

  it('refuses an embed that is not on the approved list', () => {
    const html = renderToStaticMarkup(<InteractiveRenderer block={block({ kind: 'embed', offline: false, embed_url: 'https://evil.example/x' })} />);
    expect(html).not.toContain('<iframe');
    expect(html).toContain('không được phép');
  });
});
