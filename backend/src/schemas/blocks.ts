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

export type BlockProblem = { at: number; field: string; message: { vi: string; en: string } };

/** Every image block that cannot be saved, with the field at fault. */
export function imageProblemsList(blocks: ReadonlyArray<{ type: string }>, opts: { requireAlt: boolean }): BlockProblem[] {
  const base = process.env.SUPABASE_URL;
  const out: BlockProblem[] = [];
  for (const [i, block] of blocks.entries()) {
    if (block.type !== 'image') continue;
    const image = block as z.infer<typeof ImageBlockSchema>;
    // Parsed, not a string prefix: `lesson-media/../other-bucket` must not pass.
    if (!base || !isLessonMediaUrl(image.url, base)) out.push({ at: i, field: 'url', message: { vi: 'ảnh phải được tải lên SciPal.', en: 'the image must be uploaded to SciPal.' } });
    else if (opts.requireAlt && !image.alt.vi.trim()) out.push({ at: i, field: 'alt.vi', message: { vi: 'ảnh cần mô tả tiếng Việt.', en: 'the image needs a Vietnamese description.' } });
  }
  return out;
}

/** Every simulation block that cannot be saved. */
export function simulationProblemsList(blocks: ReadonlyArray<{ type: string }>): BlockProblem[] {
  const mediaBase = process.env.SUPABASE_URL;
  const out: BlockProblem[] = [];
  for (const [i, block] of blocks.entries()) {
    if (block.type !== 'interactive') continue;
    const check = validateSimulationBlock(block as z.infer<typeof InteractiveBlockSchema>, { mediaBase });
    if (!check.ok) out.push({ at: i, field: 'config', message: check.message });
  }
  return out;
}

/** Why the lesson's images cannot be saved, or null. */
export function imageProblems(blocks: ReadonlyArray<{ type: string }>, opts: { requireAlt: boolean }): string | null {
  const first = imageProblemsList(blocks, opts)[0];
  return first ? `Khối ${first.at + 1}: ${first.message.vi}` : null;
}

/** The first simulation block that cannot be saved, as a bilingual API error, or null. */
export function simulationProblem(blocks: ReadonlyArray<{ type: string }>): { error: string; error_en: string } | null {
  const first = simulationProblemsList(blocks)[0];
  return first ? { error: `Khối ${first.at + 1}: ${first.message.vi}`, error_en: `Block ${first.at + 1}: ${first.message.en}` } : null;
}
