import { createBrowserClient } from '@scipal/supabase';

export interface TermItem {
  id: string;
  term_en: string;
  term_vi: string;
  part_of_speech: string | null;
  definition_en: string;
  definition_vi: string;
  example_en: string | null;
  example_vi: string | null;
}

export async function getAllTerms(subjectSlug?: string): Promise<TermItem[]> {
  try {
    const supabase = createBrowserClient();

    let query = supabase
      .from('terms')
      .select('id, term_en, term_vi, part_of_speech, definition_en, definition_vi, example_en, example_vi, subjects!inner(slug, name_vi)')
      .order('term_en');

    if (subjectSlug) {
      query = query.eq('subjects.slug', subjectSlug);
    }

    const { data } = await query;
    if (data && data.length > 0) return data as TermItem[];
  } catch (err) {
    console.warn('Supabase getAllTerms failed, falling back:', err);
  }

  // Fallback terms matching seed data
  return [
    {
      id: 'term-algorithm',
      term_en: 'algorithm',
      term_vi: 'thuật toán',
      part_of_speech: 'noun',
      definition_en: 'A step-by-step procedure for solving a problem.',
      definition_vi: 'Một tập hợp các bước có thứ tự để giải quyết một vấn đề.',
      example_en: 'Binary search is an efficient search algorithm.',
      example_vi: 'Tìm kiếm nhị phân là một thuật toán tìm kiếm hiệu quả.',
    },
    {
      id: 'term-complexity',
      term_en: 'time complexity',
      term_vi: 'độ phức tạp thời gian',
      part_of_speech: 'noun',
      definition_en: 'The computational complexity that describes the amount of computer time it takes to run an algorithm.',
      definition_vi: 'Thước đo mô tả thời gian máy tính cần để thực thi một thuật toán theo kích thước đầu vào.',
      example_en: 'The time complexity of binary search is O(log n).',
      example_vi: 'Độ phức tạp thời gian của tìm kiếm nhị phân là O(log n).',
    },
    {
      id: 'term-recursion',
      term_en: 'recursion',
      term_vi: 'đệ quy',
      part_of_speech: 'noun',
      definition_en: 'A process in which a function calls itself directly or indirectly.',
      definition_vi: 'Một phương pháp trong đó một hàm tự gọi lại chính nó trực tiếp hoặc gián tiếp.',
      example_en: 'Binary search can be implemented using recursion.',
      example_vi: 'Tìm kiếm nhị phân có thể được cài đặt bằng đệ quy.',
    },
  ];
}
