import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { hasMath, splitMath } from './mathText';
import { MathText } from '@/components/math/MathText';

describe('splitMath', () => {
  it('finds inline and display formulas in every notation', () => {
    expect(splitMath('Cho $y = \\frac{ax+b}{cx+d}$ với $$c \\neq 0$$ và \\(x\\to 1^-\\), \\[x^2\\]')).toEqual([
      { kind: 'text', value: 'Cho ' },
      { kind: 'math', value: 'y = \\frac{ax+b}{cx+d}', display: false },
      { kind: 'text', value: ' với ' },
      { kind: 'math', value: 'c \\neq 0', display: true },
      { kind: 'text', value: ' và ' },
      { kind: 'math', value: 'x\\to 1^-', display: false },
      { kind: 'text', value: ', ' },
      { kind: 'math', value: 'x^2', display: true },
    ]);
  });

  it('keeps escaped, lone and empty dollar signs as text', () => {
    expect(splitMath('Giá \\$5 và $10')).toEqual([{ kind: 'text', value: 'Giá $5 và $10' }]);
    expect(splitMath('$$')).toEqual([{ kind: 'text', value: '$$' }]);
    expect(hasMath('2 * 3 = 6\n1. không phải danh sách')).toBe(false);
  });
});

describe('MathText', () => {
  it('typesets formulas and never inserts the text as HTML', () => {
    const html = renderToStaticMarkup(createElement(MathText, { text: '<b>x</b> và $\\sqrt{2}$' }));
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('$');
  });
});
