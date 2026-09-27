import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe('subject accent as text', () => {
  it('subject grid colours text with --accent-ink, which stays readable in dark mode', () => {
    const css = read('../../features/subjects/subject-grid.module.css');
    expect(css.match(/(^|\s)color:\s*var\(--accent[,)]/gm) ?? []).toEqual([]);
  });
});
