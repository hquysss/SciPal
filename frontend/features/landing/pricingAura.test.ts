import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The paid plan's glow spreads well past its card (over the Monthly/Yearly switch above it), so it
// must never take clicks.
describe('pricing aura', () => {
  it('lets clicks through the glow around the paid plan', () => {
    const css = readFileSync(join(__dirname, 'pricing.module.css'), 'utf8');
    const rule = css.match(/\.aura::before\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toContain('inset: -14%');
    expect(rule).toMatch(/pointer-events:\s*none/);
  });
});
