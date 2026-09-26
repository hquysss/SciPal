import { THEME_PALETTES } from '@scipal/ui';
import type { SceneColorRole } from './sceneObjects';

export type SceneColors = Record<SceneColorRole, string>;

const TOKENS: Record<SceneColorRole, string> = {
  paper: '--paper',
  surface: '--surface',
  ink: '--ink',
  line: '--line',
  nav: '--nav',
  navInk: '--nav-ink',
  action: '--action',
};

/** Scene colors come from the level's theme tokens; missing tokens fall back to the neutral palette. */
export function readSceneColors(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>): SceneColors {
  const fallback = THEME_PALETTES.neutral.light;
  const colors = {} as SceneColors;
  for (const role of Object.keys(TOKENS) as SceneColorRole[]) {
    colors[role] = style.getPropertyValue(TOKENS[role]).trim() || fallback[role];
  }
  return colors;
}
