import { describe, expect, it } from 'vitest';
import { getTutorLessons } from './tutorLessons';

function client(rows: unknown[]) {
  const result = { data: rows, error: null };
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => Promise.resolve(result);
  return { from: () => b } as never;
}

const row = (id: string, subjects: unknown) => ({ id, title_vi: id, title_en: id, grade: 11, subject_id: 's', sort_order: 1, subjects });

describe('getTutorLessons', () => {
  it('leaves out lessons whose subject is archived (hidden, so embedded as null)', async () => {
    const lessons = await getTutorLessons(client([row('keep', { name_vi: 'Tin học', name_en: 'Informatics', sort_order: 1 }), row('hide', null)]));
    expect(lessons.map((l) => l.id)).toEqual(['keep']);
  });
});
