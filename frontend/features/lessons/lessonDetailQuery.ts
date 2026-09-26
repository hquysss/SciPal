import { createBrowserClient } from '@scipal/supabase';
import { BlockSchema, type Block } from '@scipal/types';
import { z } from 'zod';

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
  };
}

export async function getLessonDetail(
  subjectSlug: string,
  lessonSlug: string,
): Promise<LessonDetail | null> {
  try {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        id, slug, title_en, title_vi, grade, blocks,
        topics!inner(name_en, name_vi),
        subjects!inner(slug, name_en, name_vi)
      `)
      .eq('subjects.slug', subjectSlug)
      .eq('slug', lessonSlug)
      .eq('status', 'published')
      .single();

    if (error || !data) return null;

    const parsedBlocks = z.array(BlockSchema).safeParse(data.blocks);
    return {
      ...data,
      blocks: parsedBlocks.success ? parsedBlocks.data : [],
      topics: data.topics as { name_en: string; name_vi: string },
      subjects: data.subjects as { slug: string; name_en: string; name_vi: string },
    };
  } catch (error) {
    console.warn('Supabase getLessonDetail query failed:', error);
    return null;
  }
}
