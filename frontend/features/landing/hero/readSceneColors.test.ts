import { THEME_PALETTES } from '@scipal/ui';
import { describe, expect, it } from 'vitest';
import { readSceneColors } from './readSceneColors';

const styleOf = (values: Record<string, string>) => ({ getPropertyValue: (name: string) => values[name] ?? '' });

describe('readSceneColors', () => {
  it('reads and trims token values', () => {
    const colors = readSceneColors(
      styleOf({
        '--paper': ' #fafafa ',
        '--surface': '#ffffff',
        '--ink': '#111111',
        '--line': '#dddddd',
        '--nav': '#2563eb',
        '--nav-ink': '#ffffff',
        '--action': '#1d4ed8',
      }),
    );
    expect(colors).toEqual({
      paper: '#fafafa',
      surface: '#ffffff',
      ink: '#111111',
      line: '#dddddd',
      nav: '#2563eb',
      navInk: '#ffffff',
      action: '#1d4ed8',
    });
  });

  it('falls back to the neutral palette for missing tokens', () => {
    const neutral = THEME_PALETTES.neutral.light;
    const colors = readSceneColors(styleOf({ '--nav': '#96693f' }));
    expect(colors.nav).toBe('#96693f');
    expect(colors.paper).toBe(neutral.paper);
    expect(colors.navInk).toBe(neutral.navInk);
    expect(colors.action).toBe(neutral.action);
  });
});
