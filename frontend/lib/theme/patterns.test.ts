import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PATTERN_URLS, THEME_LEVELS } from '@scipal/ui';

const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url));

describe.each(THEME_LEVELS)('pattern for %s', (level) => {
  const url = PATTERN_URLS[level];
  const file = `${PUBLIC_DIR}${url}`;

  it('has its own file', () => {
    expect(url).toBe(`/patterns/${level}.svg`);
    expect(existsSync(file)).toBe(true);
  });

  it('is a small, static, single-colour 320px mask tile', () => {
    const svg = readFileSync(file, 'utf8');
    expect(statSync(file).size).toBeLessThan(4096);
    expect(svg).toMatch(/viewBox="0 0 320 320"/);
    expect(svg).not.toMatch(/<script|<image|<foreignObject|href=|on[a-z]+=/i);
    const colours = new Set((svg.match(/#[0-9a-fA-F]{3,6}\b/g) ?? []).map((c) => c.toLowerCase()));
    expect([...colours]).toEqual(['#000']);
  });
});
