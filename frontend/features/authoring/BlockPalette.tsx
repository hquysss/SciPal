'use client';

import type { Block } from '@scipal/types';

interface BlockPaletteProps {
  onAddBlock: (block: Block) => void;
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const addTheory = () => {
    onAddBlock({
      type: 'theory',
      content: {
        en: 'Write your bilingual theory concept here with full markdown formatting support...',
        vi: 'Nhập nội dung lý thuyết khoa học tại đây với định dạng Markdown phong phú...',
      },
    });
  };

  const addCode = () => {
    onAddBlock({
      type: 'code',
      tabs: [
        {
          lang: 'python',
          code: '# SciPal Code Sandbox\ndef binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n',
        },
      ],
    });
  };

  const addFormula = () => {
    onAddBlock({
      type: 'formula',
      katex: 'T(n) = 2T\\left(\\frac{n}{2}\\right) + \\mathcal{O}(n)',
      caption: {
        en: 'Divide and Conquer Recurrence relation',
        vi: 'Hệ thức đệ quy của thuật toán chia để trị',
      },
    });
  };

  const addQuiz = () => {
    onAddBlock({
      type: 'quiz',
      question_id: '11111111-1111-4111-8111-111111111111',
    });
  };

  const addInteractive = () => {
    onAddBlock({
      type: 'interactive',
      kind: 'algorithm-sim',
      heading: {
        en: 'Interactive Binary Search Simulator',
        vi: 'Mô phỏng tương tác Tìm kiếm nhị phân',
      },
      offline: true,
      config: { speed: 1, step: 0 },
    });
  };

  const addTermRef = () => {
    onAddBlock({
      type: 'term-ref',
      term_id: '22222222-2222-4222-8222-222222222222',
    });
  };

  const addResourceRef = () => {
    onAddBlock({
      type: 'resource-ref',
      resource_id: '33333333-3333-4333-8333-333333333333',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-purple-200/80 bg-purple-50/70 p-3.5 shadow-2xs backdrop-blur-xs dark:border-purple-900/50 dark:bg-purple-950/30">
      <span className="self-center text-xs font-mono font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 mr-2">
        + Thêm khối nội dung:
      </span>

      <button
        type="button"
        onClick={addTheory}
        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs hover:bg-purple-100/60 active:scale-95 transition dark:border-purple-800 dark:bg-card dark:text-gray-200"
      >
        <span>📖</span>
        <span>Lý thuyết</span>
      </button>

      <button
        type="button"
        onClick={addCode}
        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs hover:bg-purple-100/60 active:scale-95 transition dark:border-purple-800 dark:bg-card dark:text-gray-200"
      >
        <span>💻</span>
        <span>Mã nguồn</span>
      </button>

      <button
        type="button"
        onClick={addFormula}
        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs hover:bg-purple-100/60 active:scale-95 transition dark:border-purple-800 dark:bg-card dark:text-gray-200"
      >
        <span>📐</span>
        <span>Công thức (KaTeX)</span>
      </button>

      <button
        type="button"
        onClick={addQuiz}
        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs hover:bg-purple-100/60 active:scale-95 transition dark:border-purple-800 dark:bg-card dark:text-gray-200"
      >
        <span>❓</span>
        <span>Câu hỏi trắc nghiệm</span>
      </button>

      <button
        type="button"
        onClick={addInteractive}
        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs hover:bg-purple-100/60 active:scale-95 transition dark:border-purple-800 dark:bg-card dark:text-gray-200"
      >
        <span>🔬</span>
        <span>Mô phỏng</span>
      </button>

      <button
        type="button"
        onClick={addTermRef}
        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs hover:bg-purple-100/60 active:scale-95 transition dark:border-purple-800 dark:bg-card dark:text-gray-200"
      >
        <span>🏷️</span>
        <span>Thuật ngữ</span>
      </button>

      <button
        type="button"
        onClick={addResourceRef}
        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs hover:bg-purple-100/60 active:scale-95 transition dark:border-purple-800 dark:bg-card dark:text-gray-200"
      >
        <span>🔗</span>
        <span>Tài nguyên</span>
      </button>
    </div>
  );
}
