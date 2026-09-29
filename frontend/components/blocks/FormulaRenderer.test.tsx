import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FormulaRenderer } from './FormulaRenderer';

const block = (katex: string) => ({ type: 'formula' as const, katex, caption: { en: '', vi: '' } });

describe('FormulaRenderer', () => {
  it('draws a formula with KaTeX', () => {
    expect(renderToStaticMarkup(<FormulaRenderer block={block('x^2')} lang="vi" />)).toContain('class="katex');
  });

  it('never turns a formula KaTeX cannot draw into HTML', () => {
    // Deep nesting overflows KaTeX's stack: it throws even with throwOnError: false.
    const payload = `${'{'.repeat(20000)}x${'}'.repeat(20000)}<img src=x onerror=alert(1)>`;
    const html = renderToStaticMarkup(<FormulaRenderer block={block(payload)} lang="vi" />);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
