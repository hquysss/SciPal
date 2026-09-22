import { z } from 'zod';

const BilingualText = z.object({ en: z.string(), vi: z.string() });

export const TheoryBlockSchema = z.object({
  type: z.literal('theory'),
  content: BilingualText,
});

export const CodeBlockSchema = z.object({
  type: z.literal('code'),
  tabs: z.array(z.object({
    lang: z.enum(['python', 'cpp', 'javascript']),
    code: z.string(),
  })).min(1),
});

export const FormulaBlockSchema = z.object({
  type: z.literal('formula'),
  katex: z.string(),
  caption: BilingualText.optional(),
});

export const QuizBlockSchema = z.object({
  type: z.literal('quiz'),
  question_id: z.string().uuid(),
});

export const InteractiveBlockSchema = z.object({
  type: z.literal('interactive'),
  kind: z.enum(['algorithm-sim', 'function-graph', 'geometry-3d', 'experiment', 'bio-diagram']),
  heading: BilingualText,
  caption: BilingualText.optional(),
  offline: z.boolean(),
  embed_url: z.string().url().optional(),
  config: z.record(z.unknown()),
});

export const TermRefBlockSchema = z.object({
  type: z.literal('term-ref'),
  term_id: z.string().uuid(),
});

export const ResourceRefBlockSchema = z.object({
  type: z.literal('resource-ref'),
  resource_id: z.string().uuid(),
});

export const BlockSchema = z.discriminatedUnion('type', [
  TheoryBlockSchema,
  CodeBlockSchema,
  FormulaBlockSchema,
  QuizBlockSchema,
  InteractiveBlockSchema,
  TermRefBlockSchema,
  ResourceRefBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;
export type TheoryBlock       = z.infer<typeof TheoryBlockSchema>;
export type CodeBlock         = z.infer<typeof CodeBlockSchema>;
export type FormulaBlock      = z.infer<typeof FormulaBlockSchema>;
export type QuizBlock         = z.infer<typeof QuizBlockSchema>;
export type InteractiveBlock  = z.infer<typeof InteractiveBlockSchema>;
export type TermRefBlock      = z.infer<typeof TermRefBlockSchema>;
export type ResourceRefBlock  = z.infer<typeof ResourceRefBlockSchema>;
