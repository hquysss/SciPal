import { createBrowserClient } from '@scipal/supabase';

export async function getSubjectWithTopicsAndLessons(subjectSlug: string) {
  try {
    const supabase = createBrowserClient();

    const { data: subject } = await supabase
      .from('subjects')
      .select('*')
      .eq('slug', subjectSlug)
      .single();

    if (subject) {
      const { data: topics } = await supabase
        .from('topics')
        .select('*, lessons(id, slug, title_en, title_vi, sort_order, published)')
        .eq('subject_id', subject.id)
        .eq('lessons.published', true)
        .order('sort_order');

      return { subject, topics: topics ?? [] };
    }
  } catch (err) {
    // Fallback if Supabase is offline or unreachable
    console.warn('Supabase query failed, falling back:', err);
  }

  // Graceful fallback for Informatics (matches seed data)
  if (subjectSlug === 'informatics') {
    return {
      subject: {
        id: '00000000-0000-0000-0000-000000000001',
        slug: 'informatics',
        name_en: 'Informatics',
        name_vi: 'Tin học',
        accent_color: '#16a34a',
        icon: '</>',
        status: 'active' as const,
        sort_order: 1,
        created_at: new Date().toISOString(),
      },
      topics: [
        {
          id: 'topic-1',
          subject_id: '00000000-0000-0000-0000-000000000001',
          slug: 'algorithms',
          name_en: 'Algorithms & Problem Solving',
          name_vi: 'Thuật toán & Giải quyết vấn đề',
          sort_order: 1,
          lessons: [
            {
              id: 'lesson-1',
              slug: 'binary-search',
              title_en: 'Binary Search Algorithm',
              title_vi: 'Thuật toán Tìm kiếm nhị phân',
              sort_order: 1,
              published: true,
            },
          ],
        },
      ],
    };
  }

  return null;
}
