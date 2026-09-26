// frontend/features/lessons/lessonDetailQuery.test.ts
import { describe, expect, it } from 'vitest';
import { classifyLessonDetail } from './lessonDetailQuery';

const row = {
  id: 'l', slug: 'search', title_en: 'Search', title_vi: 'Tìm kiếm', grade: 4,
  blocks: [{ type: 'theory', content: { en: 'a', vi: 'b' } }],
  topics: { name_en: 'T', name_vi: 'T' },
  subjects: { slug: 'science', name_en: 'Science', name_vi: 'Khoa học', icon: '◌', accent_color: '#0891b2' },
};

describe('classifyLessonDetail', () => {
  it('maps errors, missing rows and published rows', () => {
    expect(classifyLessonDetail({ data: null, error: { message: 'down' } })).toEqual({ kind: 'error' });
    expect(classifyLessonDetail({ data: null, error: null })).toEqual({ kind: 'not_found' });
    expect(classifyLessonDetail({ data: row, error: null })).toMatchObject({ kind: 'ok', lesson: { slug: 'search', subjects: { accent_color: '#0891b2' } } });
  });

  it('keeps the page alive with no blocks when stored blocks are invalid', () => {
    expect(classifyLessonDetail({ data: { ...row, blocks: [{ type: 'bogus' }] }, error: null }))
      .toMatchObject({ kind: 'ok', lesson: { blocks: [] } });
  });
});
