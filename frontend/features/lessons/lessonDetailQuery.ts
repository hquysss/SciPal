import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { BlockSchema, type Block } from '@scipal/types';
import { z } from 'zod';
import type { QueryOutcome } from './subjectPageQuery';

export interface LessonDetail {
  id: string;
  slug: string;
  title_en: string;
  title_vi: string;
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

export function classifyLessonDetail(outcome: QueryOutcome<Record<string, unknown> | null>): LessonDetailResult {
  if (outcome.error) return { kind: 'error' };
  if (!outcome.data) return { kind: 'not_found' };

  const row = outcome.data as unknown as Omit<LessonDetail, 'blocks'> & { blocks: unknown };
  const parsedBlocks = z.array(BlockSchema).safeParse(row.blocks);
  return {
    kind: 'ok',
    lesson: {
      ...row,
      blocks: parsedBlocks.success ? parsedBlocks.data : [],
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
        id, slug, title_en, title_vi, grade, blocks,
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
