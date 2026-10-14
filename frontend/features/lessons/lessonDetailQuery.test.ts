// frontend/features/lessons/lessonDetailQuery.test.ts
import { describe, expect, it, vi } from 'vitest';
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

  it('keeps the page alive with no blocks when stored blocks are not an array', () => {
    expect(classifyLessonDetail({ data: { ...row, blocks: 'bogus' }, error: null }))
      .toMatchObject({ kind: 'ok', lesson: { blocks: [] } });
  });

  it('drops only the blocks it does not know, such as a newer interactive kind', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const theory = row.blocks[0];
    const future = { type: 'interactive', kind: 'not-deployed-yet', heading: { en: 'New', vi: 'Mới' }, config: {} };
    const result = classifyLessonDetail({ data: { ...row, blocks: [theory, future, theory] }, error: null });
    expect(result).toMatchObject({ kind: 'ok', lesson: { blocks: [theory, theory] } });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('block 1'), expect.anything());
    warn.mockRestore();
  });
});
