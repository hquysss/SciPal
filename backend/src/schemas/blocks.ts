import { z } from 'zod';
import { SIMULATION_KINDS, isLessonMediaUrl, validateSimulationBlock } from './simulations.js';

// The backend is deployed with `backend/` as Vercel's root directory, so it
// must not load runtime schemas from the sibling workspace package at runtime.
// Keep this validation contract aligned with packages/types/src/block.ts.
const BilingualText = z.object({ en: z.string(), vi: z.string() });

const TheoryBlockSchema = z.object({
  type: z.literal('theory'),
  content: BilingualText,
});

const CodeBlockSchema = z.object({
  type: z.literal('code'),
  tabs: z.array(z.object({
    lang: z.enum(['python', 'cpp', 'javascript']),
    code: z.string(),
  })).min(1),
});

const FormulaBlockSchema = z.object({
  type: z.literal('formula'),
  katex: z.string(),
  caption: BilingualText.optional(),
});

const QuizBlockSchema = z.object({
  type: z.literal('quiz'),
  question_id: z.string().uuid(),
});

const InteractiveBlockSchema = z.object({
  type: z.literal('interactive'),
  /** Settings are checked per kind by simulationProblem (simulations.ts). */
  kind: z.enum(SIMULATION_KINDS),
  heading: BilingualText,
  caption: BilingualText.optional(),
  offline: z.boolean(),
  embed_url: z.string().url().optional(),
  config: z.record(z.unknown()),
});

const TermRefBlockSchema = z.object({
  type: z.literal('term-ref'),
  term_id: z.string().uuid(),
});

const ResourceRefBlockSchema = z.object({
  type: z.literal('resource-ref'),
  resource_id: z.string().uuid(),
});

const ImageBlockSchema = z.object({
  type: z.literal('image'),
  url: z.string().url().max(1000),
  alt: BilingualText,
  caption: BilingualText.optional(),
});

export const BlockSchema = z.discriminatedUnion('type', [
  TheoryBlockSchema,
  CodeBlockSchema,
  FormulaBlockSchema,
  QuizBlockSchema,
  InteractiveBlockSchema,
  TermRefBlockSchema,
  ResourceRefBlockSchema,
  ImageBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;

/** Public URL prefix of the lesson-media bucket, or null when Supabase is not configured. */
export function lessonMediaPrefix(): string | null {
  const base = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  return base ? `${base}/storage/v1/object/public/lesson-media/` : null;
}

/** Why the lesson's images cannot be saved, or null. */
export function imageProblems(blocks: ReadonlyArray<{ type: string }>, opts: { requireAlt: boolean }): string | null {
  const base = process.env.SUPABASE_URL;
  for (const [i, block] of blocks.entries()) {
    if (block.type !== 'image') continue;
    const image = block as z.infer<typeof ImageBlockSchema>;
    // Parsed, not a string prefix: `lesson-media/../other-bucket` must not pass.
    if (!base || !isLessonMediaUrl(image.url, base)) return `Khối ${i + 1}: ảnh phải được tải lên SciPal.`;
    if (opts.requireAlt && !image.alt.vi.trim()) return `Khối ${i + 1}: ảnh cần mô tả tiếng Việt.`;
  }
  return null;
}

/** The first simulation block that cannot be saved, as a bilingual API error, or null. */
export function simulationProblem(blocks: ReadonlyArray<{ type: string }>): { error: string; error_en: string } | null {
  const mediaBase = process.env.SUPABASE_URL;
  for (const [i, block] of blocks.entries()) {
    if (block.type !== 'interactive') continue;
    const check = validateSimulationBlock(block as z.infer<typeof InteractiveBlockSchema>, { mediaBase });
    if (!check.ok) return { error: `Khối ${i + 1}: ${check.message.vi}`, error_en: `Block ${i + 1}: ${check.message.en}` };
  }
  return null;
}
