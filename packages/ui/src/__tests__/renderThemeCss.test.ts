import { describe, expect, it } from 'vitest';
import { renderThemeCss, THEME_LEVELS, THEME_PALETTES } from '../theme';

describe('renderThemeCss', () => {
  const css = renderThemeCss({ systemDark: true });

  it('never targets the document root', () => {
    expect(css).not.toMatch(/:root/);
    expect(css).not.toMatch(/(^|[\s,{}])html[\s,{[.:]/);
  });

  it.each(THEME_LEVELS)('emits light, explicit dark and explicit light rules for %s', (level) => {
    expect(css).toContain(`[data-level="${level}"]{`);
    expect(css).toContain(`[data-theme="dark"][data-level="${level}"],[data-theme="dark"] [data-level="${level}"]{`);
    expect(css).toContain(`[data-theme="light"][data-level="${level}"],[data-theme="light"] [data-level="${level}"]{`);
  });

  it('puts palette values into custom properties', () => {
    expect(css).toMatch(/\[data-level="neutral"\]\{[^}]*--nav:#15803D;/);
    expect(css).toMatch(/\[data-level="primary"\]\{[^}]*--ink-muted:#5E4A36;/);
    expect(css).toMatch(/\[data-level="primary"\]\{[^}]*--pattern-url:url\("\/patterns\/primary\.svg"\);/);
    expect(css).toMatch(/\[data-level="primary"\]\{[^}]*--accent-ink-ratio:60%;/);
    expect(css).toMatch(/\[data-level="primary"\]\{[^}]*color-scheme:light;/);
  });

  it('maps shadcn aliases onto every level scope', () => {
    expect(css).toContain('[data-level]{--background:var(--paper);');
    expect(css).toContain('--muted-foreground:var(--ink-muted);');
    expect(css).toContain('--border:var(--edge);');
  });

  it('derives accent ink where the subject accent is declared', () => {
    expect(css).toContain(
      '[data-subject-scope]{--accent-ink:color-mix(in srgb,var(--accent) var(--accent-ink-ratio),var(--ink));}',
    );
  });

  it('paints the shell and its pattern layer, hiding the pattern for high contrast and print', () => {
    expect(css).toContain('[data-app-shell]::before{');
    expect(css).toContain('mask-image:var(--pattern-url);');
    expect(css).toContain('[data-pattern="off"]{background-color:var(--paper);}');
    expect(css).toMatch(/@media \(prefers-contrast: more\),print\{\[data-app-shell\]::before\{display:none;\}\}/);
  });

  it('follows the system color scheme only when enabled', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark){');
    expect(renderThemeCss({ systemDark: false })).not.toContain('prefers-color-scheme');
  });
});

describe('dark mode depth', () => {
  it('scales the background glows and subject tints up in dark mode only', () => {
    const css = renderThemeCss({ systemDark: true });
    expect(css).toContain('--glow-scale:1;');
    expect(css).toContain('--glow-scale:1.6;');
    expect(css).toContain('--tint-scale:1;');
    expect(css).toContain('--tint-scale:2;');
  });
});

describe('illustration materials', () => {
  it('keeps paper light in illustrations even in dark mode', () => {
    const css = renderThemeCss({ systemDark: true });
    for (const level of THEME_LEVELS) {
      const light = THEME_PALETTES[level].light;
      const occurrences = css.split(`--art-paper:${light.paper};`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
      expect(css).toContain(`--art-surface:${light.surface};`);
      expect(css).toContain(`--art-ink:${light.ink};`);
    }
  });
});
