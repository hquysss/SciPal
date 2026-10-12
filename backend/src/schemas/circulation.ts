import { z } from 'zod';

/** Heart rate in beats per minute; 75 gives the textbook 0.8 s cycle (0.1 + 0.3 + 0.4 s). */
export const CirculationConfig = z.object({
  view: z.enum(['body', 'heart', 'vessels', 'types', 'regulation']).default('body'),
  heartRate: z.number().int().min(40).max(180).default(75),
  loop: z.enum(['both', 'pulmonary', 'systemic']).default('both'),
  labels: z.boolean().default(true),
});
