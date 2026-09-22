import { z } from 'zod';

const BilingualText = z.object({ en: z.string(), vi: z.string() });

export const MCDataSchema = z.object({
  stem: BilingualText,
  options: z.array(z.object({
    id: z.string(),
    text: BilingualText,
  })).min(2),
  answer: z.string(),
  explanation: BilingualText.optional(),
});

export const TrueFalseDataSchema = z.object({
  stem: BilingualText,
  items: z.array(z.object({
    id: z.string(),
    text: BilingualText,
    correct: z.boolean(),
  })).min(1),
  explanation: BilingualText.optional(),
});

export const ShortDataSchema = z.object({
  stem: BilingualText,
  answer_key: z.string(),   // server-side only; never sent to client
  rubric: BilingualText.optional(),
});

export type MCData        = z.infer<typeof MCDataSchema>;
export type TrueFalseData = z.infer<typeof TrueFalseDataSchema>;
export type ShortData     = z.infer<typeof ShortDataSchema>;
