'use client';

import type { Block } from '@scipal/types';
import { BookOpen, Code2, FlaskConical, HelpCircle, Link2, Sigma, Tag, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Button } from '../../components/ui/button';

interface BlockPaletteProps {
  onAddBlock: (block: Block) => void;
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const { t } = useLanguage();
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

  const items: { icon: LucideIcon; label: { en: string; vi: string }; add: () => void }[] = [
    { icon: BookOpen, label: { en: 'Theory', vi: 'Lý thuyết' }, add: addTheory },
    { icon: Code2, label: { en: 'Code', vi: 'Mã nguồn' }, add: addCode },
    { icon: Sigma, label: { en: 'Formula', vi: 'Công thức' }, add: addFormula },
    { icon: HelpCircle, label: { en: 'Quiz', vi: 'Câu hỏi' }, add: addQuiz },
    { icon: FlaskConical, label: { en: 'Simulation', vi: 'Mô phỏng' }, add: addInteractive },
    { icon: Tag, label: { en: 'Term', vi: 'Thuật ngữ' }, add: addTermRef },
    { icon: Link2, label: { en: 'Resource', vi: 'Tài nguyên' }, add: addResourceRef },
  ];

  return (
    <section aria-labelledby="block-palette-heading" className="flex flex-col gap-3 rounded-xl border border-line bg-surface-sunken p-4">
      <h2 id="block-palette-heading" className="text-sm font-semibold text-ink">
        {t({ en: 'Add a block', vi: 'Thêm khối nội dung' })}
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map(({ icon: Icon, label, add }) => (
          <Button key={label.en} type="button" variant="outline" onClick={add}>
            <Icon aria-hidden="true" />
            {t(label)}
          </Button>
        ))}
      </div>
    </section>
  );
}
