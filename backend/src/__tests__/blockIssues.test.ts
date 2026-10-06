import { describe, expect, it } from 'vitest';
import type { ZodError } from 'zod';
import { BlockSchema } from '../schemas/blocks.js';
import { blockFailure, imageIssues, partPositions, schemaIssues, simulationIssues } from '../schemas/blockIssues.js';

describe('partPositions', () => {
  it('numbers blocks within their part like the editor', () => {
    expect(partPositions([{ type: 'theory' }, { type: 'quiz' }, { type: 'code' }, { type: 'interactive' }, { type: 'quiz' }])).toEqual([
      { part: 'lesson', index: 0 }, { part: 'practice', index: 0 }, { part: 'lesson', index: 1 }, { part: 'lesson', index: 2 }, { part: 'practice', index: 1 },
    ]);
  });
});

describe('schemaIssues', () => {
  it('names the part, block and field of each zod problem, in both languages', () => {
    const raw = [{ type: 'theory', content: { vi: 'ok', en: 'ok' } }, { type: 'formula', katex: 7 }, { type: 'theory', content: { vi: 1 } }];
    const parsed = BlockSchema.array().safeParse(raw);
    expect(parsed.success).toBe(false);
    const issues = schemaIssues(raw, (parsed as { error: ZodError }).error);
    expect(issues).toContainEqual(expect.objectContaining({ part: 'lesson', index: 1, field: 'katex' }));
    expect(issues).toContainEqual(expect.objectContaining({ part: 'lesson', index: 2, field: 'content.vi' }));
    for (const issue of issues) {
      expect(issue.vi).toMatch(/Khối \d+/);
      expect(issue.en).toMatch(/Block \d+/);
    }
  });

  it('reports an unknown block type once, not one line per union member', () => {
    const raw = [{ type: 'video', url: 'x' }];
    const parsed = BlockSchema.array().safeParse(raw);
    const issues = schemaIssues(raw, (parsed as { error: ZodError }).error);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ part: 'lesson', index: 0, field: 'type' });
  });
});

describe('image and simulation issues', () => {
  it('numbers them within the part', () => {
    process.env.MEDIA_PUBLIC_URL = 'https://pub-test.r2.dev';
    const blocks = [{ type: 'theory', content: { vi: 'a', en: '' } }, { type: 'image', url: 'https://evil.example/x.png', alt: { vi: '', en: '' } }];
    expect(imageIssues(blocks, { requireAlt: true })[0]).toMatchObject({ part: 'lesson', index: 1, field: 'url' });
    expect(simulationIssues([{ type: 'interactive', kind: 'nope', heading: { vi: 'x', en: '' }, offline: true, config: {} }] as never)[0]).toMatchObject({ part: 'lesson', index: 0 });
  });

  it('takes a theory popover picture only when SciPal stores it', () => {
    process.env.MEDIA_PUBLIC_URL = 'https://pub-test.r2.dev';
    const note = (url: string) => ({ term: { vi: 'a', en: '' }, definition: { vi: 'b', en: '' }, image: { url, alt: { vi: '', en: '' } } });
    const theory = (url: string) => ({ type: 'theory', content: { vi: '{note:abc123:a}', en: '' }, notes: { abc123: note(url) } });
    expect(BlockSchema.safeParse(theory('https://pub-test.r2.dev/x.png')).success).toBe(true);
    expect(BlockSchema.safeParse({ ...theory('https://pub-test.r2.dev/x.png'), notes: { 'BAD KEY': note('https://pub-test.r2.dev/x.png') } }).success).toBe(false);
    expect(imageIssues([theory('https://pub-test.r2.dev/lesson-media/x.png')], { requireAlt: true })).toEqual([]);
    expect(imageIssues([theory('https://evil.example/x.png')], { requireAlt: true })[0]).toMatchObject({ index: 0, field: 'notes.abc123.image.url' });
  });

  it('builds a bilingual 400 body', () => {
    const body = blockFailure([{ part: 'lesson', index: 2, field: 'katex', vi: 'Khối 3: công thức sai.', en: 'Block 3: invalid formula.' }]);
    expect(body).toMatchObject({ error: 'Có 1 chỗ cần sửa: Khối 3: công thức sai.', error_en: '1 thing to fix: Block 3: invalid formula.' });
    expect(body.issues).toHaveLength(1);
  });
});
