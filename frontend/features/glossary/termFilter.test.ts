import { describe, expect, it } from 'vitest';
import { PAGE_SIZE, filterTerms, normalize, shownToReach, termSubjects } from './termFilter';
import type { TermItem } from './termQueries';

const term = (id: string, en: string, vi: string, subject: string | null): TermItem => ({
  id,
  term_en: en,
  term_vi: vi,
  part_of_speech: 'noun',
  definition_en: `${en} definition`,
  definition_vi: `định nghĩa ${vi}`,
  example_en: null,
  example_vi: null,
  subject_slug: subject,
  subject_name_en: subject ? `${subject} EN` : null,
  subject_name_vi: subject ? `${subject} VI` : null,
  subject_order: subject === 'math' ? 1 : subject === 'physics' ? 2 : 3,
});

const TERMS = [
  term('a', 'algorithm', 'thuật toán', 'informatics'),
  term('b', 'function', 'hàm số', 'math'),
  term('c', 'function', 'hàm', 'informatics'),
  term('d', 'force', 'lực', 'physics'),
];

describe('glossary filter', () => {
  it('ignores Vietnamese accents and case', () => {
    expect(normalize('Thuật Toán')).toBe('thuat toan');
    expect(normalize('Đạo hàm')).toBe('dao ham');
    expect(filterTerms(TERMS, { query: 'thuat toan', subject: 'all', saved: null }).map((t) => t.id)).toEqual(['a']);
  });

  it('filters by subject', () => {
    expect(filterTerms(TERMS, { query: '', subject: 'informatics', saved: null }).map((t) => t.id)).toEqual(['a', 'c']);
    expect(filterTerms(TERMS, { query: 'function', subject: 'math', saved: null }).map((t) => t.id)).toEqual(['b']);
  });

  it('shows only saved terms when asked', () => {
    expect(filterTerms(TERMS, { query: '', subject: 'all', saved: new Set(['d']) }).map((t) => t.id)).toEqual(['d']);
  });

  it('lists the subjects that have terms, in curriculum order, with counts', () => {
    expect(termSubjects(TERMS)).toEqual([
      { slug: 'math', name: { en: 'math EN', vi: 'math VI' }, count: 1 },
      { slug: 'physics', name: { en: 'physics EN', vi: 'physics VI' }, count: 1 },
      { slug: 'informatics', name: { en: 'informatics EN', vi: 'informatics VI' }, count: 2 },
    ]);
  });
});

describe('paging', () => {
  it('shows a page of terms at first', () => {
    expect(PAGE_SIZE).toBe(20);
  });
  it('keeps the shown count when the term is already on screen', () => {
    expect(shownToReach(5, 20)).toBe(20);
    expect(shownToReach(19, 20)).toBe(20);
  });
  it('grows by whole pages to reach a linked term further down', () => {
    expect(shownToReach(20, 20)).toBe(40);
    expect(shownToReach(65, 20)).toBe(80);
  });
  it('leaves the count alone when the term is not in the list', () => {
    expect(shownToReach(-1, 20)).toBe(20);
  });
});
