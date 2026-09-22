import type { ExamQuestionItem } from './ExamRunner';

export interface ExamBlueprintData {
  blueprint: {
    id: string;
    title_en: string;
    title_vi: string;
    duration_minutes: number;
    total_questions: number;
  };
  questions: ExamQuestionItem[];
}

export async function getExamBlueprint(blueprintId: string): Promise<ExamBlueprintData> {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

  try {
    const res = await fetch(`${API_BASE}/api/exam/${blueprintId}/questions`, {
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('getExamBlueprint fetch error, returning fallback:', err);
  }

  // Graceful fallback for demo / offline
  return {
    blueprint: {
      id: blueprintId,
      title_en: 'Informatics Benchmark Examination',
      title_vi: 'Đề thi khảo sát năng lực Tin học',
      duration_minutes: 45,
      total_questions: 5,
    },
    questions: [
      {
        id: 'q-demo-1',
        type: 'mc',
        difficulty: 'medium',
        data: {
          stem: {
            en: 'What is the worst-case time complexity of Binary Search on a sorted array of size N?',
            vi: 'Độ phức tạp thời gian trong trường hợp xấu nhất của thuật toán Tìm kiếm nhị phân trên mảng đã sắp xếp kích thước N là gì?',
          },
          options: [
            { id: 'opt-a', text: { en: 'O(1)', vi: 'O(1)' } },
            { id: 'opt-b', text: { en: 'O(log N)', vi: 'O(log N)' } },
            { id: 'opt-c', text: { en: 'O(N)', vi: 'O(N)' } },
            { id: 'opt-d', text: { en: 'O(N log N)', vi: 'O(N log N)' } },
          ],
        },
      },
      {
        id: 'q-demo-2',
        type: 'mc',
        difficulty: 'easy',
        data: {
          stem: {
            en: 'Which Python keyword is used to define an anonymous or inline function?',
            vi: 'Từ khóa nào trong Python được sử dụng để định nghĩa hàm ẩn danh (inline function)?',
          },
          options: [
            { id: 'opt-a', text: { en: 'def', vi: 'def' } },
            { id: 'opt-b', text: { en: 'func', vi: 'func' } },
            { id: 'opt-c', text: { en: 'lambda', vi: 'lambda' } },
            { id: 'opt-d', text: { en: 'inline', vi: 'inline' } },
          ],
        },
      },
      {
        id: 'q-demo-3',
        type: 'mc',
        difficulty: 'hard',
        data: {
          stem: {
            en: 'Which data structure operates on a Last-In, First-Out (LIFO) principle?',
            vi: 'Cấu trúc dữ liệu nào hoạt động theo nguyên lý Vào sau, Ra trước (LIFO)?',
          },
          options: [
            { id: 'opt-a', text: { en: 'Queue (Hàng đợi)', vi: 'Queue (Hàng đợi)' } },
            { id: 'opt-b', text: { en: 'Stack (Ngăn xếp)', vi: 'Stack (Ngăn xếp)' } },
            { id: 'opt-c', text: { en: 'Linked List (Danh sách liên kết)', vi: 'Linked List (Danh sách liên kết)' } },
            { id: 'opt-d', text: { en: 'Binary Tree (Cây nhị phân)', vi: 'Binary Tree (Cây nhị phân)' } },
          ],
        },
      },
      {
        id: 'q-demo-4',
        type: 'mc',
        difficulty: 'medium',
        data: {
          stem: {
            en: 'In Python, which of the following collections is immutable?',
            vi: 'Trong Python, kiểu tập hợp dữ liệu nào sau đây là bất biến (immutable)?',
          },
          options: [
            { id: 'opt-a', text: { en: 'List', vi: 'List' } },
            { id: 'opt-b', text: { en: 'Dictionary', vi: 'Dictionary' } },
            { id: 'opt-c', text: { en: 'Set', vi: 'Set' } },
            { id: 'opt-d', text: { en: 'Tuple', vi: 'Tuple' } },
          ],
        },
      },
      {
        id: 'q-demo-5',
        type: 'mc',
        difficulty: 'medium',
        data: {
          stem: {
            en: 'What does SQL stand for in database management?',
            vi: 'Từ viết tắt SQL trong quản trị cơ sở dữ liệu có nghĩa là gì?',
          },
          options: [
            { id: 'opt-a', text: { en: 'Structured Query Language', vi: 'Structured Query Language' } },
            { id: 'opt-b', text: { en: 'Simple Question Language', vi: 'Simple Question Language' } },
            { id: 'opt-c', text: { en: 'System Query Logic', vi: 'System Query Logic' } },
            { id: 'opt-d', text: { en: 'Standard Quick Language', vi: 'Standard Quick Language' } },
          ],
        },
      },
    ],
  };
}
