import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { TheoryRenderer } from './TheoryRenderer';

const markdown = [
  '## Thuật toán tìm kiếm',
  '',
  'Đoạn văn có **chữ đậm**, `mã` và [liên kết](https://example.com).',
  '',
  '- Tuần tự',
  '- Nhị phân',
  '',
  '| Cách | Độ phức tạp |',
  '|---|---|',
  '| Tuần tự | O(n) |',
  '',
  '```',
  'for i in range(n): pass',
  '```',
].join('\n');

const block = { type: 'theory' as const, content: { en: 'English body', vi: markdown } };

describe('TheoryRenderer', () => {
  const html = renderToStaticMarkup(<TheoryRenderer block={block} lang="vi" />);

  it('renders the selected language', () => {
    expect(html).toContain('Thuật toán tìm kiếm');
    expect(renderToStaticMarkup(<TheoryRenderer block={block} lang="en" />)).toContain('English body');
  });

  it('styles markdown with tokens instead of the missing typography plugin', () => {
    expect(html).not.toContain('prose');
    expect(html).toMatch(/<h2 class="[^"]*text-ink/);
    expect(html).toMatch(/<ul class="[^"]*list-disc/);
    expect(html).toMatch(/<a [^>]*class="[^"]*text-action/);
    expect(countRawColors(html).total).toBe(0);
  });

  it('keeps wide tables and code inside their own scroll area', () => {
    expect(html).toMatch(/<div class="[^"]*overflow-x-auto[^"]*"><table/);
    expect(html).toMatch(/<pre class="[^"]*overflow-x-auto/);
  });

  it('wraps long unbroken words instead of widening the page', () => {
    expect(html).toMatch(/^<div class="[^"]*\[overflow-wrap:anywhere\]/);
  });

  it('seats headings on a ruled line instead of centring them across one', () => {
    expect(html).toMatch(/<h2 class="[^"]*pt-7[^"]*leading-7/);
    expect(html).not.toContain('leading-[3.5rem]');
  });

  it('does not style a fenced block without a language as inline code', () => {
    expect(html).toMatch(/<pre [^>]*><code>for i in range/);
  });

  it('opens external links safely', () => {
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
});
