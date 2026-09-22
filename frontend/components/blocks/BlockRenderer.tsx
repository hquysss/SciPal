'use client';
import { useLanguage } from '@scipal/hooks';
import type { Block } from '@scipal/types';
import { TheoryRenderer } from './TheoryRenderer';
import { CodeRenderer } from './CodeRenderer';
import { FormulaRenderer } from './FormulaRenderer';
import { QuizBlock } from './QuizBlock';
import { InteractiveRenderer } from './InteractiveRenderer';
import { TermRefCard } from './TermRefCard';
import { ResourceRefCard } from './ResourceRefCard';

export function BlockRenderer({ block }: { block: Block }) {
  const { lang } = useLanguage();

  switch (block.type) {
    case 'theory':
      return <TheoryRenderer block={block} lang={lang} />;
    case 'code':
      return <CodeRenderer block={block} />;
    case 'formula':
      return <FormulaRenderer block={block} lang={lang} />;
    case 'quiz':
      return (
        <div className="my-4 rounded-xl border border-dashed border-gray-200 p-4 text-xs text-gray-500">
          [Câu hỏi trắc nghiệm {block.question_id}]
        </div>
      );
    case 'interactive':
      return <InteractiveRenderer block={block} />;
    case 'term-ref':
      return <TermRefCard termId={block.term_id} lang={lang} />;
    case 'resource-ref':
      return (
        <ResourceRefCard
          url="https://visualgo.net/en/sorting"
          titleVi="Mô phỏng thuật toán trực quan"
          titleEn="Interactive Algorithm Visualization"
          lang={lang}
        />
      );
    default:
      console.warn('BlockRenderer: unknown block type', (block as Block).type);
      return null;
  }
}
