import { z } from 'zod';

export const SubjectStatusSchema = z.enum(['active', 'upcoming']);

export const SubjectSchema = z.object({
  id:           z.string().uuid(),
  slug:         z.string(),
  name_en:      z.string(),
  name_vi:      z.string(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon:         z.string(),
  status:       SubjectStatusSchema,
  sort_order:   z.number().int(),
});

export type Subject       = z.infer<typeof SubjectSchema>;
export type SubjectStatus = z.infer<typeof SubjectStatusSchema>;
