import { describe, expect, it } from 'vitest';
import { applyFormat } from './markdownToolbar';

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
