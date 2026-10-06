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

  it('renders inline and display formulas written with $ signs', () => {
    const vi = 'Diện tích $S = a^2$.\n\n$$\n\\frac{1}{2}\n$$';
    const out = renderToStaticMarkup(<TheoryRenderer block={{ type: 'theory', content: { vi, en: '' } }} lang="vi" />);
    expect(out).toContain('class="katex"');
    expect(out).toContain('katex-display');
    expect(out).not.toContain('$S = a^2$');
  });

  it('shows a broken formula instead of failing', () => {
    const out = renderToStaticMarkup(<TheoryRenderer block={{ type: 'theory', content: { vi: 'Sai: $\\frac{1}{$ nhé', en: '' } }} lang="vi" />);
    expect(out).toContain('nhé');
  });
});

describe('TheoryRenderer colours', () => {
  it('colours {name:text} with theme tokens and leaves code and unknown names alone', () => {
    const html = renderToStaticMarkup(
      <TheoryRenderer block={{ type: 'theory', content: { en: '', vi: 'Có {red:đỏ} và **{blue:xanh}**, `{red:mã}`, {pink:lạ}, $x$' } }} lang="vi" />,
    );
    expect(html).toContain('<span class="text-danger">đỏ</span>');
    expect(html).toContain('<span class="text-action">xanh</span>');
    expect(html).toContain('{red:mã}');
    expect(html).toContain('{pink:lạ}');
    expect(html).toContain('class="katex"');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('TheoryRenderer term tags', () => {
  const ID = '11111111-1111-4111-8111-111111111111';
  const render = (vi: string) => renderToStaticMarkup(<TheoryRenderer block={{ type: 'theory', content: { en: '', vi } }} lang="vi" />);

  it('shows the display text of a tag, never the marker', () => {
    const html = render(`Một {term:${ID}:thuật toán} đơn giản.`);
    expect(html).toContain('thuật toán');
    expect(html).not.toContain('{term:');
  });

  it('works inside a table cell', () => {
    const html = render(`| Từ | Ghi chú |\n|---|---|\n| {term:${ID}:biến} | x |`);
    expect(html).toMatch(/<td[^>]*>biến<\/td>|<td[^>]*>.*biến.*<\/td>/);
    expect(html).not.toContain('{term:');
  });

  it('leaves a tag in inline code as typed, next to colours', () => {
    const html = render(`\`{term:${ID}:x}\` và {red:đỏ}`);
    expect(html).toContain(`{term:${ID}:x}`);
    expect(html).toContain('<span class="text-danger">đỏ</span>');
  });
});
