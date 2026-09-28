import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILES = ['src/routes/authoring.ts', 'src/routes/media.ts'];

describe('authoring errors are bilingual', () => {
  it.each(FILES)('%s: every error body has error_en', (file) => {
    const src = readFileSync(file, 'utf8');
    const vietnameseOnly = [...src.matchAll(/\.send\(\{ error: ('[^']*'|`[^`]*`|[A-Za-z_.]+)(?!, error_en)/g)].map((m) => m[0]);
    expect(vietnameseOnly).toEqual([]);
  });
});
