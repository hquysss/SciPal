import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import type { Bilingual } from './catalog';

/** One simulation inside a published lesson, linking the Lab to the lesson that teaches it. */
export interface LabUsage {
  kind: string;
  heading: Bilingual;
  lesson: Bilingual;
  href: string;
  grade: number;
}

interface LessonRow {
  slug: string;
  title_en: string;
  title_vi: string;
  grade: number;
  blocks: unknown;
  subjects: { slug: string } | Array<{ slug: string }>;
}

const text = (value: unknown): Bilingual => {
  const v = (value ?? {}) as Partial<Bilingual>;
  return { en: typeof v.en === 'string' ? v.en : '', vi: typeof v.vi === 'string' ? v.vi : '' };
};

/** Every interactive block of the given rows, in lesson order; malformed blocks are skipped. */
export function usagesOf(rows: readonly LessonRow[]): LabUsage[] {
  const out: LabUsage[] = [];
  for (const row of rows) {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    if (!subject || !Array.isArray(row.blocks)) continue;
    for (const block of row.blocks as Array<Record<string, unknown>>) {
      if (block?.type !== 'interactive' || typeof block.kind !== 'string') continue;
      out.push({
        kind: block.kind,
        heading: text(block.heading),
        lesson: { en: row.title_en, vi: row.title_vi },
        href: `/${subject.slug}/${row.slug}`,
        grade: row.grade,
      });
    }
  }
  return out.sort((a, b) => a.grade - b.grade);
}

/** Simulations in published lessons, or null when they cannot be read (the Lab still opens). */
export async function getLabUsages(): Promise<LabUsage[] | null> {
  try {
    const supabase = createServerClient(await cookies());
    const { data, error } = await supabase
      .from('lessons')
      .select('slug, title_en, title_vi, grade, blocks, subjects!inner(slug)')
      .eq('status', 'published')
      .filter('blocks', 'cs', JSON.stringify([{ type: 'interactive' }]))
      .limit(500);
    if (error) throw error;
    return usagesOf((data ?? []) as unknown as LessonRow[]);
  } catch (error) {
    console.warn('Lab lessons query failed:', error);
    return null;
  }
}
