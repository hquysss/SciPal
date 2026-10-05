import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXAM_TEMPLATES, buildLayout, validateLayout, type TemplateKey } from '../schemas/examFormat.js';

// Tests run from backend/ (pnpm --filter @scipal/api test); the shared source lives in @scipal/types.
const SHARED = '../packages/types/src';

describe('backend mirror of the exam format contract', () => {
  it('is the same source as @scipal/types (Vercel cannot load the sibling package)', () => {
    expect(readFileSync('src/schemas/examFormat.ts', 'utf8').replace(/\r\n/g, '\n')).toBe(
      readFileSync(`${SHARED}/examFormat.ts`, 'utf8').replace(/\r\n/g, '\n'),
    );
  });

  it.each(Object.keys(EXAM_TEMPLATES) as TemplateKey[])('accepts the %s template layout', (key) => {
    expect(validateLayout(buildLayout(key)).ok).toBe(true);
  });

  it('rejects a layout that repeats a question', () => {
    const layout = buildLayout('thptqg:math');
    const id = '00000000-0000-4000-8000-000000000001';
    layout[0]!.groups[0]!.question_ids = [id];
    layout[1]!.groups[0]!.question_ids = [id];
    const result = validateLayout(layout);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.vi).toContain('lặp');
  });
});
