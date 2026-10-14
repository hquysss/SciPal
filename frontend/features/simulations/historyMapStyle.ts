// Map symbols shared by the 3D and flat history maps. Colours are theme tokens: our side red like
// the textbook's arrows, areas held green, the enemy in ink; every line has a casing in the
// surface colour so it reads on the light relief in either theme.

export const MAP_TOKENS = { ours: '--danger', enemy: '--ink', area: '--success', casing: '--surface' } as const;
export type Palette = Record<keyof typeof MAP_TOKENS, string>;

export const PLACE_MARK = { city: '◉', battle: '★', base: '⚑', area: '' } as const;
