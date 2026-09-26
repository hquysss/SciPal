import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  mixHex,
  THEME_LEVELS,
  THEME_MODES,
  THEME_PALETTES,
  type ThemePalette,
} from '../theme';

describe('contrast helpers', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('mixes two colors in sRGB', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#ff0000', '#0000ff', 1)).toBe('#ff0000');
    expect(mixHex('#ff0000', '#0000ff', 0)).toBe('#0000ff');
  });
});

const TEXT_ON: (keyof ThemePalette)[] = ['paper', 'surface', 'surfaceSunken'];

describe.each(THEME_LEVELS.flatMap((level) => THEME_MODES.map((mode) => [level, mode] as const)))(
  'palette %s / %s',
  (level, mode) => {
    const p = THEME_PALETTES[level][mode];
    const ratio = (fg: keyof ThemePalette, bg: string) => contrastRatio(p[fg] as string, bg);

    it.each(['ink', 'muted'] as const)('%s text reaches 4.5:1 on every background', (fg) => {
      for (const bg of TEXT_ON) expect(ratio(fg, p[bg] as string)).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps ink, muted and action readable over the pattern at full strength', () => {
      const patterned = mixHex(p.patternInk, p.paper, p.patternOpacity);
      for (const fg of ['ink', 'muted', 'action'] as const) {
        expect(ratio(fg, patterned)).toBeGreaterThanOrEqual(4.5);
      }
    });

    it.each(['danger', 'success', 'warning'] as const)('%s reaches 4.5:1 on paper, surface and its own surface', (tone) => {
      const own = p[`${tone}Surface` as keyof ThemePalette] as string;
      for (const bg of [p.paper, p.surface, own]) expect(ratio(tone, bg)).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps action text, edges and focus visible', () => {
      for (const bg of [p.paper, p.surface]) {
        expect(ratio('action', bg)).toBeGreaterThanOrEqual(4.5);
        expect(ratio('edge', bg)).toBeGreaterThanOrEqual(3);
        expect(ratio('focus', bg)).toBeGreaterThanOrEqual(3);
      }
      expect(ratio('actionInk', p.action)).toBeGreaterThanOrEqual(4.5);
      expect(ratio('actionInk', p.actionHover)).toBeGreaterThanOrEqual(4.5);
      expect(ratio('navInk', p.nav)).toBeGreaterThanOrEqual(4.5);
    });

    it('uses six-digit hex colors and a small pattern opacity', () => {
      for (const [key, value] of Object.entries(p)) {
        if (key === 'patternOpacity') continue;
        expect(value).toMatch(/^#[0-9A-F]{6}$/);
      }
      expect(p.patternOpacity).toBeGreaterThan(0);
      expect(p.patternOpacity).toBeLessThanOrEqual(0.08);
    });
  },
);
