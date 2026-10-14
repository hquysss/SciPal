import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { BlockSchema, type Block } from '@scipal/types';
import type { QueryOutcome } from './subjectPageQuery';

export interface LessonDetail {
  id: string;
  slug: string;
  title_en: string;
  title_vi: string;
  /** Where the lesson comes from (e.g. the textbook), when its author wrote it. */
  source?: string | null;
  /** False when a teacher switched off the automatic tagging of core terms in this lesson. */
  auto_terms: boolean;
  grade: number;
  blocks: Block[];
  topics: {
    name_en: string;
    name_vi: string;
  };
  subjects: {
    slug: string;
    name_en: string;
    name_vi: string;
    icon: string;
    accent_color: string;
  };
}

export type LessonDetailResult =
  | { kind: 'ok'; lesson: LessonDetail }
  | { kind: 'not_found' }
  | { kind: 'error' };

const one = <T,>(value: T | T[]): T => (Array.isArray(value) ? value[0]! : value);

// Content can reach the database before the code that knows a new block (e.g. a newer interactive
// kind) is deployed, so one unknown block is dropped instead of emptying the whole lesson.
function parseKnownBlocks(blocks: unknown): Block[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((block, index) => {
    const parsed = BlockSchema.safeParse(block);
    if (parsed.success) return [parsed.data];
    console.warn(`Skipping lesson block ${index}: it does not match BlockSchema.`, parsed.error.issues);
    return [];
  });
}

export function classifyLessonDetail(outcome: QueryOutcome<Record<string, unknown> | null>): LessonDetailResult {
  if (outcome.error) return { kind: 'error' };
  if (!outcome.data) return { kind: 'not_found' };

  const row = outcome.data as unknown as Omit<LessonDetail, 'blocks'> & { blocks: unknown };
  return {
    kind: 'ok',
    lesson: {
      ...row,
      blocks: parseKnownBlocks(row.blocks),
      topics: one(row.topics),
      subjects: one(row.subjects),
    },
  };
}

export async function getLessonDetail(subjectSlug: string, lessonSlug: string): Promise<LessonDetailResult> {
  try {
    const supabase = createServerClient(await cookies());
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        id, slug, title_en, title_vi, source, auto_terms, grade, blocks,
        topics!inner(name_en, name_vi),
        subjects!inner(slug, name_en, name_vi, icon, accent_color)
      `)
      .eq('subjects.slug', subjectSlug)
      .eq('slug', lessonSlug)
      .eq('status', 'published')
      .maybeSingle();

    return classifyLessonDetail({ data: data as Record<string, unknown> | null, error });
  } catch (error) {
    console.warn('Lesson detail query failed:', error);
    return { kind: 'error' };
  }
}
