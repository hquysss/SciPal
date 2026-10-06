import { describe, it, expect } from 'vitest';
import { BlockSchema } from '../block';

describe('BlockSchema', () => {
  it('parses a valid theory block', () => {
    const input = {
      type: 'theory',
      content: { en: 'Hello', vi: 'Xin chào' },
    };
    expect(() => BlockSchema.parse(input)).not.toThrow();
  });

  it('parses a valid code block with multiple tabs', () => {
    const input = {
      type: 'code',
      tabs: [
        { lang: 'python', code: 'print("hello")' },
        { lang: 'cpp',    code: 'cout << "hello";' },
      ],
    };
    expect(() => BlockSchema.parse(input)).not.toThrow();
  });

  it('parses a valid interactive block', () => {
    const input = {
      type: 'interactive',
      kind: 'algorithm-sim',
      heading: { en: 'Binary Search', vi: 'Tìm kiếm nhị phân' },
      offline: true,
      config: { algorithm: 'binary-search', data: [1,2,3], target: 2 },
    };
    expect(() => BlockSchema.parse(input)).not.toThrow();
  });

  it('rejects a block with unknown type', () => {
    const input = { type: 'video', url: 'https://example.com' };
    expect(() => BlockSchema.parse(input)).toThrow();
  });

  it('rejects an interactive block with invalid kind', () => {
    const input = {
      type: 'interactive',
      kind: 'unknown-kind',
      heading: { en: 'X', vi: 'Y' },
      offline: true,
      config: {},
    };
    expect(() => BlockSchema.parse(input)).toThrow();
  });

  it('rejects a theory block missing vi content', () => {
    const input = { type: 'theory', content: { en: 'Hello' } };
    expect(() => BlockSchema.parse(input)).toThrow();
  });

  it('accepts popover notes with a short key, and rejects a key that is not', () => {
    const note = { term: { vi: 'Dao động cơ', en: 'Oscillation' }, definition: { vi: 'x', en: '' } };
    const block = { type: 'theory', content: { vi: '{note:abc123:Dao động cơ}', en: '' } };
    expect(BlockSchema.parse({ ...block, notes: { abc123: note } })).toMatchObject({ notes: { abc123: note } });
    expect(() => BlockSchema.parse({ ...block, notes: { 'x y': note } })).toThrow();
    expect(BlockSchema.parse(block)).not.toHaveProperty('notes');
  });
});
