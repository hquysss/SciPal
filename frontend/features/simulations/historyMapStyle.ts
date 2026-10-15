// Map symbols shared by the 3D and flat history maps. The colours are the map's own, like the
// textbook's maps, and stay the same in every theme (asked for: a history map should look like one,
// not like the app): they are custom properties set by `.mapColors` in historyMap.module.css.

export const MAP_TOKENS = {
  ours: '--map-ours',
  enemy: '--map-enemy',
  casing: '--map-casing',
  area: '--map-area',
  areaLine: '--map-area-line',
  areaEnemy: '--map-area-enemy',
  areaEnemyLine: '--map-area-enemy-line',
  streak: '--map-streak',
} as const;
/** For SVG and HTML, which can use the custom properties directly. */
export const MAP_VAR = Object.fromEntries(Object.entries(MAP_TOKENS).map(([k, v]) => [k, `var(${v})`])) as Record<keyof typeof MAP_TOKENS, string>;
export type Palette = Record<keyof typeof MAP_TOKENS, string>;

export const PLACE_MARK = { city: '◉', battle: '★', base: '⚑', area: '' } as const;
