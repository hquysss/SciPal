import { z } from 'zod';

/** Playback is deliberately slowed for teaching, not a measurement of reflex latency. */
export const KneeReflexConfig = z.object({
  speed: z.number().finite().min(0.5).max(2).default(1),
  view: z.enum(['body', 'circuit']).default('body'),
  labels: z.boolean().default(true),
});
