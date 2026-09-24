import { createBrowserClient } from '@scipal/supabase';

export async function getSubjectWithTopicsAndLessons(subjectSlug: string) {
  try {
    const supabase = createBrowserClient();
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('*')
      .eq('slug', subjectSlug)
      .single();

    if (subjectError || !subject) return null;

    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*, lessons(id, slug, title_en, title_vi, sort_order, published)')
      .eq('subject_id', subject.id)
      .eq('lessons.published', true)
      .order('sort_order');

    if (topicsError) return null;
    return { subject, topics: topics ?? [] };
  } catch (error) {
    console.warn('Supabase subject lessons query failed:', error);
    return null;
  }
}
