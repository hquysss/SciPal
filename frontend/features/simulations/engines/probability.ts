import type { SimulationConfigByKind } from '@scipal/types';

type ProbabilityConfig = SimulationConfigByKind['probability'];

export const MAX_BATCH = 1000;

/** A small seeded generator, for repeatable tests; the simulation uses Math.random. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function faceCount(config: ProbabilityConfig): number {
  return config.object === 'coin' ? 2 : config.faces;
}

/** How many times each face came up in `trials` throws (at most 1000 per batch). */
export function throwBatch(config: ProbabilityConfig, trials: number, random: () => number = Math.random): number[] {
  const counts = new Array<number>(faceCount(config)).fill(0);
  const n = Math.min(Math.max(Math.floor(trials), 0), MAX_BATCH);
  for (let i = 0; i < n; i += 1) counts[Math.min(Math.floor(random() * counts.length), counts.length - 1)]! += 1;
  return counts;
}
