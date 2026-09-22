import type { Block } from '@scipal/types';

export interface AuthoringLessonData {
  id: string;
  title_vi: string;
  title_en: string;
  subject_slug: string;
  published: boolean;
  blocks: Block[];
}

export async function getAuthoringLesson(lessonId: string): Promise<AuthoringLessonData> {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

  try {
    const res = await fetch(`${API_BASE}/api/lessons/${lessonId}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return data.lesson;
    }
  } catch (err) {
    console.warn('getAuthoringLesson fetch error, returning fallback:', err);
  }

  // Fallback demo lesson for authoring preview
  return {
    id: lessonId,
    title_vi: 'Thuật toán Tìm kiếm nhị phân',
    title_en: 'Binary Search Algorithm',
    subject_slug: 'informatics',
    published: true,
    blocks: [
      {
        type: 'theory',
        content: {
          en: '### Divide and Conquer Principle\nBinary search works on sorted arrays by repeatedly dividing the search interval in half.',
          vi: '### Nguyên lý Chia để trị\nTìm kiếm nhị phân áp dụng trên dãy đã sắp xếp bằng cách liên tục chia đôi khoảng tìm kiếm.',
        },
      },
      {
        type: 'formula',
        katex: 'T(n) = \\mathcal{O}(\\log n)',
        caption: {
          en: 'Logarithmic Time Complexity',
          vi: 'Độ phức tạp thời gian logarit',
        },
      },
      {
        type: 'code',
        tabs: [
          {
            lang: 'python',
            code: 'def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n',
          },
        ],
      },
    ],
  };
}
