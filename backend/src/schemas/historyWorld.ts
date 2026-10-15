import { z } from 'zod';

// A built-in animated world map from the History 11 textbook: a slider walks through the stages
// and countries tint by their ruling power, or light up when they win independence. The maps
// themselves are fixed content in the app (frontend/features/simulations/historyWorldData.ts);
// a lesson only picks which one to show. Keep backend/src/schemas/historyWorld.ts in sync.

export const HISTORY_WORLD_MAPS = ['empires-1914', 'latin-america'] as const;
export type HistoryWorldMap = (typeof HISTORY_WORLD_MAPS)[number];

export const HistoryWorldConfig = z.object({
  /** empires-1914: SGK Hình 6 tr.15 · latin-america: SGK Hình 4 tr.14. */
  map: z.enum(HISTORY_WORLD_MAPS).default('empires-1914'),
});
