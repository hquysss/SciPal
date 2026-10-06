import { describe, expect, it } from 'vitest';
import { applyFormat, applyTerm } from './markdownToolbar';

describe('applyFormat', () => {
  it('wraps the selection and keeps it selected', () => {
    expect(applyFormat('a nhị phân b', 2, 10, 'bold')).toEqual({ text: 'a **nhị phân** b', start: 4, end: 12 });
    expect(applyFormat('x', 0, 1, 'math')).toEqual({ text: '$x$', start: 1, end: 2 });
  });

  it('prefixes the current lines for headings and lists', () => {
    expect(applyFormat('một\nhai', 0, 7, 'list').text).toBe('- một\n- hai');
    expect(applyFormat('Tiêu đề', 3, 3, 'heading').text).toBe('## Tiêu đề');
    expect(applyFormat('- đã có', 0, 0, 'list').text).toBe('- đã có');
  });

  it('inserts a placeholder when nothing is selected', () => {
    expect(applyFormat('ab', 1, 1, 'italic')).toEqual({ text: 'a*chữ nghiêng*b', start: 2, end: 13 });
  });
});

describe('applyColor', () => {
  it('wraps the selection in a colour tag', async () => {
    const { applyColor } = await import('./markdownToolbar');
    expect(applyColor('a quan trọng b', 2, 12, 'red')).toEqual({ text: 'a {red:quan trọng} b', start: 7, end: 17 });
  });
});

describe('applyTerm', () => {
  const ID = '11111111-1111-4111-8111-111111111111';

  it('tags the selection and keeps its words selected', () => {
    const out = applyTerm('Thuật toán là…', 0, 10, ID);
    expect(out.text).toBe(`{term:${ID}:Thuật toán} là…`);
    expect(out.text.slice(out.start, out.end)).toBe('Thuật toán');
  });

  it('drops inline formatting so the tag stays one piece of text', () => {
    expect(applyTerm('**thuật toán** ở `x` $y$', 0, 14, ID).text).toBe(`{term:${ID}:thuật toán} ở \`x\` $y$`);
    expect(applyTerm('a $x$ _b_ ~c~ [d]', 0, 17, ID).text).toBe(`{term:${ID}:a x b c d}`);
  });

  it('changes nothing without a selection', () => {
    expect(applyTerm('abc', 1, 1, ID)).toEqual({ text: 'abc', start: 1, end: 1 });
  });

  it('cleans braces and line breaks out of the selection', () => {
    expect(applyTerm('a{b}\nc', 0, 6, ID).text).toBe(`{term:${ID}:a b  c}`);
  });
});
