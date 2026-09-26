import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const layout = readFileSync(fileURLToPath(new URL('../../app/layout.tsx', import.meta.url)), 'utf8');

describe('noscript streaming fallback', () => {
  it('only targets the landing, not every page inside the level-themed app shell', () => {
    const noscript = layout.slice(layout.indexOf('<noscript>'), layout.indexOf('</noscript>'));
    expect(noscript).toContain('body:has(');
    expect(noscript).not.toMatch(/\[data-level\]/);
  });
});
