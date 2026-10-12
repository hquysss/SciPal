import { z } from 'zod';

/** Skin and senses (Biology 11, lesson 17): receptors in the skin and the withdrawal reflex arc. */
export const SkinSensesConfig = z.object({
  view: z.enum(['receptors', 'reflex']).default('receptors'),
  stimulus: z.enum(['touch', 'pressure', 'pain', 'cold', 'heat']).default('touch'),
  labels: z.boolean().default(true),
});
