// frontend/features/authoring/lessonImport.test.ts
import { describe, expect, it } from 'vitest';
import { MAX_LESSON_IMPORT_BYTES, parseLessonImport } from './lessonImport';

const theory = { type: 'theory', content: { en: 'Hi', vi: 'Chào' } };
const run = (value: unknown, size = 100) => parseLessonImport(JSON.stringify(value), size);

describe('parseLessonImport', () => {
  it('accepts a lesson object and trims titles', () => {
    expect(run({ title_en: ' Binary search ', title_vi: 'Tìm kiếm nhị phân', blocks: [theory] })).toEqual({
      ok: true, title_en: 'Binary search', title_vi: 'Tìm kiếm nhị phân', blocks: [theory],
    });
  });

  it('accepts a bare array of blocks', () => {
    expect(run([theory])).toEqual({ ok: true, blocks: [theory] });
  });

  it('points at the first invalid field', () => {
    const result = run({ blocks: [theory, theory, theory, { type: 'theory', content: { en: 'x' } }] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.vi).toContain('blocks[3].content.vi');
      expect(result.error.vi).toContain('bắt buộc');
      expect(result.error.en).toContain('required');
    }
  });

  it('rejects an unknown block type', () => {
    const result = run([{ type: 'video', url: 'x' }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.en).toContain('blocks[0].type');
  });

  it.each([
    ['empty blocks', { blocks: [] }],
    ['missing blocks key', { title_en: 'A', title_vi: 'B' }],
    ['whitespace title', { title_vi: '   ', blocks: [theory] }],
    ['overlong title', { title_en: 'x'.repeat(201), blocks: [theory] }],
  ])('rejects %s', (_label, value) => {
    expect(run(value).ok).toBe(false);
  });

  it('rejects files over 1 MB before parsing', () => {
    expect(parseLessonImport('[]', MAX_LESSON_IMPORT_BYTES + 1)).toMatchObject({ ok: false });
    expect(MAX_LESSON_IMPORT_BYTES).toBe(1_048_576);
  });

  it('rejects broken JSON', () => {
    expect(parseLessonImport('{ "blocks": [', 20)).toMatchObject({ ok: false });
  });
});
