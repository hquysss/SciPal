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

    const { data } = await supabase
      .from('lessons')
      .select(`
        id, slug, title_en, title_vi, grade, blocks,
        topics!inner(name_en, name_vi),
        subjects!inner(slug, name_en, name_vi)
      `)
      .eq('subjects.slug', subjectSlug)
      .eq('slug', lessonSlug)
      .eq('published', true)
      .single();

    if (data) {
      const parsedBlocks = z.array(BlockSchema).safeParse(data.blocks);
      return {
        ...data,
        blocks: parsedBlocks.success ? parsedBlocks.data : [],
        topics: data.topics as { name_en: string; name_vi: string },
        subjects: data.subjects as { slug: string; name_en: string; name_vi: string },
      };
    }
  } catch (err) {
    console.warn('Supabase getLessonDetail query failed, falling back:', err);
  }

  // Fallback for seed lesson
  if (subjectSlug === 'informatics' && (lessonSlug === 'binary-search' || lessonSlug === 'intro-to-algorithms')) {
    const fallbackBlocks: Block[] = [
      {
        type: 'theory',
        content: {
          en: 'Binary search is an efficient algorithm for finding a target value in a **sorted** array. It works by repeatedly halving the search interval.',
          vi: 'Tìm kiếm nhị phân là thuật toán hiệu quả để tìm giá trị mục tiêu trong mảng **đã sắp xếp**. Thuật toán hoạt động bằng cách liên tục thu hẹp phạm vi tìm kiếm một nửa.',
        },
      },
      {
        type: 'formula',
        katex: 'T(n) = \\mathcal{O}(\\log n)',
        caption: {
          en: 'Time complexity of binary search',
          vi: 'Độ phức tạp thời gian của tìm kiếm nhị phân',
        },
      },
      {
        type: 'term-ref',
        term_id: 'term-algorithm',
      },
      {
        type: 'code',
        tabs: [
          {
            lang: 'python',
            code: 'def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1',
          },
          {
            lang: 'cpp',
            code: 'int binarySearch(const vector<int>& arr, int target) {\n    int lo = 0, hi = arr.size() - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}',
          },
        ],
      },
      {
        type: 'interactive',
        kind: 'algorithm-sim',
        heading: {
          en: 'Try Binary Search',
          vi: 'Thử nghiệm thuật toán Tìm kiếm nhị phân',
        },
        caption: {
          en: 'Observe how the pointers lo, mid, hi change after each step.',
          vi: 'Quan sát các con trỏ lo, mid, hi thay đổi sau từng bước.',
        },
        offline: true,
        config: {
          algorithm: 'binary-search',
          data: [4, 8, 15, 16, 23, 42],
          target: 23,
        },
      },
      {
        type: 'resource-ref',
        resource_id: 'res-visualgo',
      },
    ];

    return {
      id: 'lesson-1',
      slug: lessonSlug,
      title_en: 'Binary Search Algorithm',
      title_vi: 'Thuật toán Tìm kiếm nhị phân',
      grade: 11,
      blocks: fallbackBlocks,
      topics: {
        name_en: 'Algorithms & Problem Solving',
        name_vi: 'Thuật toán & Giải quyết vấn đề',
      },
      subjects: {
        slug: 'informatics',
        name_en: 'Informatics',
        name_vi: 'Tin học',
      },
    };
  }

  return null;
}
