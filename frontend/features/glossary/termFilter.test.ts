import { describe, expect, it } from 'vitest';
import { filterTerms, normalize, subjectCounts } from './termFilter';
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

  it('counts terms per subject, leaving out subjects with none', () => {
    expect(subjectCounts(TERMS)).toEqual({ informatics: 2, math: 1, physics: 1 });
  });
});
