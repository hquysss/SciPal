import { describe, expect, it } from 'vitest';
import type { ExamSection } from '@scipal/types';
import { arrangeQuestions, dropOrderSeed, loadOrderSeed, seededShuffle } from './examOrder';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
};
const ids = (list: Array<{ id: string }>) => list.map((q) => q.id);
const qs = (...names: string[]) => names.map((id) => ({ id }));
const text = (vi: string) => ({ vi, en: vi });

describe('seededShuffle', () => {
  it('gives the same order for the same seed and keeps every item', () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    expect(seededShuffle(items, 'a')).toEqual(seededShuffle(items, 'a'));
    expect([...seededShuffle(items, 'a')].sort((x, y) => x - y)).toEqual(items);
  });
  it('gives a different order for another seed', () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    expect(seededShuffle(items, 'a')).not.toEqual(seededShuffle(items, 'b'));
  });
});

describe('the order seed of an exam', () => {
  it('is made once and kept until it is dropped', () => {
    const store = memory();
    const first = loadOrderSeed('bp', store);
    expect(loadOrderSeed('bp', store)).toBe(first);
    dropOrderSeed('bp', store);
    expect(loadOrderSeed('bp', store)).not.toBe(first);
  });
});

describe('arrangeQuestions', () => {
  const layout = [
    { key: 'p1', title: text('Phần I'), kind: 'mcq', groups: [{ passage: text(''), question_ids: ['a', 'b', 'c', 'd', 'e', 'f'] }] },
    { key: 'p2', title: text('Phần II'), kind: 'mcq', groups: [
      { passage: text('Đoạn văn'), question_ids: ['g', 'h', 'i'] },
      { passage: text(''), question_ids: ['j'] },
      { passage: text(''), question_ids: ['k'] },
    ] },
  ] as unknown as ExamSection[];
  const all = qs('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k');

  it('keeps each section where it is and every question in its own section', () => {
    for (const seed of ['s1', 's2', 's3', 's4']) {
      const out = ids(arrangeQuestions(all, layout, seed));
      expect(out.slice(0, 6).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
      expect(out.slice(6).sort()).toEqual(['g', 'h', 'i', 'j', 'k']);
    }
  });

  it('shuffles the questions of a section', () => {
    const orders = new Set(['s1', 's2', 's3', 's4', 's5'].map((seed) => ids(arrangeQuestions(all, layout, seed)).slice(0, 6).join('')));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('keeps a passage group together and in its own order', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) {
      const out = ids(arrangeQuestions(all, layout, seed));
      const at = out.indexOf('g');
      expect(out.slice(at, at + 3)).toEqual(['g', 'h', 'i']);
    }
  });

  it('is the same order again for the same seed', () => {
    expect(arrangeQuestions(all, layout, 'same')).toEqual(arrangeQuestions(all, layout, 'same'));
  });

  it('puts a question that is outside the layout after the sections', () => {
    const out = ids(arrangeQuestions([...all, { id: 'z' }], layout, 's1'));
    expect(out.at(-1)).toBe('z');
    expect(out).toHaveLength(12);
  });

  it('shuffles all of an exam that has no layout', () => {
    const many = qs(...Array.from({ length: 20 }, (_, i) => `q${i}`));
    const out = ids(arrangeQuestions(many, null, 's1'));
    expect([...out].sort()).toEqual(ids(many).sort());
    expect(out).not.toEqual(ids(many));
  });
});
