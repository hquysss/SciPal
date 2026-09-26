import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const FLAGS_DIR = fileURLToPath(new URL('../../public/flags/', import.meta.url));

describe('flag icons', () => {
  it('ships the Vietnamese and British flags', () => {
    expect(readdirSync(FLAGS_DIR).sort()).toEqual(['gb.svg', 'vn.svg']);
  });

  it.each(['vn.svg', 'gb.svg'])('%s is a small, inert SVG', (file) => {
    const path = join(FLAGS_DIR, file);
    const source = readFileSync(path, 'utf8');
    expect(statSync(path).size).toBeLessThan(2048);
    expect(source).toContain('<svg');
    expect(source).not.toMatch(/<script|href|\son[a-z]+=|<image|foreignObject/i);
  });
});
