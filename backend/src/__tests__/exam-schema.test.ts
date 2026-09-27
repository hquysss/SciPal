import { describe, expect, it } from 'vitest';
import { examSections, validateExamInput } from '../schemas/exams.js';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const id = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const base = { name: 'Đề 1', name_en: '', subject_id: SUBJECT, grade: 10, duration_minutes: 45, question_ids: [] as string[] };

describe('validateExamInput', () => {
  it('accepts a new exam whose English name waits until submit', () => {
    const res = validateExamInput(base, 'create');
    expect(res).toEqual({ ok: true, value: base });
  });

  it('refuses out-of-range values, bad ids, duplicates and too many questions', () => {
    for (const patch of [
      { duration_minutes: 4 },
      { duration_minutes: 301 },
      { grade: 0 },
      { grade: 13 },
      { name: 'x'.repeat(201) },
      { name: '  ' },
      { question_ids: ['nope'] },
      { question_ids: Array.from({ length: 201 }, (_, i) => id(i)) },
    ]) {
      expect(validateExamInput({ ...base, ...patch }, 'create').ok, JSON.stringify(patch).slice(0, 40)).toBe(false);
    }
    const dup = validateExamInput({ ...base, question_ids: [id(1), id(1)] }, 'create');
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.message.vi).toMatch(/lặp/);
  });

  it('takes a partial update that carries the version it was made from', () => {
    expect(validateExamInput({ duration_minutes: 60, expected_updated_at: '2026-09-27T00:00:00Z' }, 'update')).toEqual({
      ok: true,
      value: { duration_minutes: 60, expected_updated_at: '2026-09-27T00:00:00Z' },
    });
    expect(validateExamInput({ duration_minutes: 60 }, 'update').ok).toBe(false);
    expect(validateExamInput({ subject_id: SUBJECT, expected_updated_at: 'x' }, 'update').ok).toBe(false);
  });
});

describe('examSections', () => {
  it('counts questions per type and difficulty in first-seen order', () => {
    expect(examSections([{ type: 'mc', difficulty: 1 }, { type: 'mc', difficulty: 1 }, { type: 'short', difficulty: 2 }])).toEqual([
      { type: 'mc', difficulty: 1, count: 2 },
      { type: 'short', difficulty: 2, count: 1 },
    ]);
  });
});
