import { describe, expect, it } from 'vitest';
import { checkExamQuestions } from '../authoring/examQuestions.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const id = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const exam = { subject_id: SUBJECT, created_by: 'teacher-1' };
const data = { stem: { vi: 'Câu?', en: 'Q?' }, answer_key: '4' };
const row = (n: number, patch: Record<string, unknown> = {}) => ({
  id: id(n), usage: 'exam', subject_id: SUBJECT, status: 'published', created_by: 'teacher-2', type: 'short', difficulty: 1, data, ...patch,
});
const check = (rows: unknown[], ids: string[], mode: 'draft' | 'review' = 'draft') =>
  checkExamQuestions(mockSupabase({ questions: mockQuery({ data: rows, error: null }) }), ids, exam, mode);

describe('checkExamQuestions', () => {
  it('returns the rows in the exam order', async () => {
    const res = await check([row(2), row(1, { created_by: 'teacher-1', status: 'draft' })], [id(1), id(2)]);
    expect(res.ok && res.rows.map((r) => r.id)).toEqual([id(1), id(2)]);
  });

  it('refuses practice, other-subject, missing and other authors’ unpublished questions, naming the position', async () => {
    for (const bad of [
      row(2, { usage: 'practice' }),
      row(2, { subject_id: '99999999-9999-4999-8999-999999999999' }),
      row(2, { status: 'draft' }),
    ]) {
      const res = await check([row(1), bad], [id(1), id(2)]);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.body.error).toMatch(/[Cc]âu 2/);
    }
    const missing = await check([row(1)], [id(1), id(2)]);
    expect(!missing.ok && missing.body.error).toMatch(/không tìm thấy/);
  });

  it('asks a submitted exam for at least one complete question', async () => {
    const empty = await check([], [], 'review');
    expect(!empty.ok && empty.body.error).toMatch(/ít nhất một câu/);
    const half = await check([row(1, { data: { stem: { vi: 'Câu?', en: '' }, answer_key: '4' } })], [id(1)], 'review');
    expect(!half.ok && half.body.error).toMatch(/Câu 1/);
    expect((await check([row(1, { data: { stem: { vi: 'Câu?', en: 'Q?' }, answer: '4' } })], [id(1)], 'review')).ok).toBe(true);
  });
});
