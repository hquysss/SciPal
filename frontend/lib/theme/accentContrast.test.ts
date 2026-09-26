import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ACCENT_INK_RATIO, contrastRatio, mixHex, THEME_LEVELS, THEME_MODES, THEME_PALETTES } from '@scipal/ui';

const CATALOG_SQL = fileURLToPath(
  new URL('../../../supabase/migrations/20260927090100_gdpt2018_catalog.sql', import.meta.url),
);
const accents = [...new Set(readFileSync(CATALOG_SQL, 'utf8').match(/#[0-9a-fA-F]{6}/g) ?? [])];

describe('subject accent ink', () => {
  it('reads every catalog accent', () => {
    expect(accents.length).toBeGreaterThanOrEqual(29);
  });

  it.each(THEME_LEVELS.flatMap((level) => THEME_MODES.map((mode) => [level, mode] as const)))(
    'stays readable on %s / %s surfaces',
    (level, mode) => {
      const p = THEME_PALETTES[level][mode];
      const failures = accents.flatMap((accent) => {
        const ink = mixHex(accent, p.ink, ACCENT_INK_RATIO[mode]);
        return [p.surface, p.surfaceSunken]
          .filter((bg) => contrastRatio(ink, bg) < 4.5)
          .map((bg) => `${accent} on ${bg}`);
      });
      expect(failures).toEqual([]);
    },
  );
});
