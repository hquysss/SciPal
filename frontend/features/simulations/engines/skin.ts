// Receptors in the skin and the withdrawal reflex (Biology 11, lesson 17). Each receptor answers only
// its own kind of stimulus, and only above its threshold; above it, a stronger stimulus gives impulses
// more often (the size of each impulse stays the same). The reflex arc runs through five parts in turn
// (Hình 17.11), slowed down so it can be followed; a damaged part stops the impulse there.

export const STIMULI = ['touch', 'pressure', 'pain', 'cold', 'heat'] as const;
export type Stimulus = (typeof STIMULI)[number];
export type ReceptorKind = 'mechanical' | 'thermal' | 'pain';

export const RECEPTORS: Record<Stimulus, { readonly kind: ReceptorKind; readonly threshold: number }> = {
  touch: { kind: 'mechanical', threshold: 10 },
  pressure: { kind: 'mechanical', threshold: 30 },
  pain: { kind: 'pain', threshold: 45 },
  cold: { kind: 'thermal', threshold: 15 },
  heat: { kind: 'thermal', threshold: 15 },
};

export const MAX_RATE = 10; // impulses per second at the strongest stimulus

/** Impulses per second from the receptor of `stimulus` for an intensity of 0–100. */
export function impulseRate(stimulus: Stimulus, intensity: number): number {
  const { threshold } = RECEPTORS[stimulus];
  if (intensity < threshold) return 0;
  return 2 + ((MAX_RATE - 2) * (intensity - threshold)) / (100 - threshold);
}

/** Moments (seconds after the stimulus starts) at which impulses leave the receptor, up to `until`. */
export function impulseTimes(stimulus: Stimulus, intensity: number, until: number): number[] {
  const rate = impulseRate(stimulus, intensity);
  if (rate === 0 || until < 0) return [];
  const out: number[] = [];
  for (let t = 0; t <= until; t += 1 / rate) out.push(t);
  return out;
}

export const REFLEX_PARTS = ['receptor', 'afferent', 'centre', 'efferent', 'effector'] as const;
export type ReflexPart = (typeof REFLEX_PARTS)[number];
/** Seconds each part takes in the slowed-down picture. */
export const REFLEX_DURATION: Record<ReflexPart, number> = { receptor: 0.3, afferent: 0.8, centre: 0.4, efferent: 0.8, effector: 0.5 };
/** From the spinal cord up to the brain, where the heat is felt. */
export const ASCENDING = 1.5;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function reflexState(time: number, broken: ReadonlySet<ReflexPart>) {
  const parts = {} as Record<ReflexPart, number>;
  let start = 0;
  let blockedAt: ReflexPart | null = null;
  for (const part of REFLEX_PARTS) {
    if (blockedAt) { parts[part] = -1; continue; }
    if (broken.has(part)) { blockedAt = part; parts[part] = time >= start ? 0 : -1; continue; }
    parts[part] = time < start ? -1 : clamp01((time - start) / REFLEX_DURATION[part]);
    start += REFLEX_DURATION[part];
  }
  const centreStart = REFLEX_DURATION.receptor + REFLEX_DURATION.afferent;
  const reachesCord = !broken.has('receptor') && !broken.has('afferent') && !broken.has('centre');
  const brain = reachesCord && time >= centreStart ? clamp01((time - centreStart) / ASCENDING) : -1;
  return {
    parts,
    blockedAt,
    /** How far the hand has been pulled back, 0–1. */
    withdrawal: blockedAt ? 0 : Math.max(0, parts.effector),
    /** Progress of the impulse toward the brain, −1 before it leaves the cord. */
    brain,
    felt: brain >= 1,
  };
}

export const REFLEX_TOTAL = REFLEX_PARTS.reduce((sum, part) => sum + REFLEX_DURATION[part], 0);
