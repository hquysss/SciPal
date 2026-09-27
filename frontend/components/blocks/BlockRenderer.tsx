'use client';
import { useLanguage } from '@scipal/hooks';
import type { Block } from '@scipal/types';
import { TheoryRenderer } from './TheoryRenderer';
import { CodeRenderer } from './CodeRenderer';
import { FormulaRenderer } from './FormulaRenderer';
import { InteractiveRenderer } from './InteractiveRenderer';
import { TermRefCard } from './TermRefCard';
import { ResourceRefCard } from './ResourceRefCard';
import { ImageRenderer } from './ImageRenderer';

export function BlockRenderer({ block }: { block: Block }) {
  const { lang, t } = useLanguage();

  switch (block.type) {
    case 'theory':
      return <TheoryRenderer block={block} lang={lang} />;
    case 'code':
      return <CodeRenderer block={block} />;
    case 'formula':
      return <FormulaRenderer block={block} lang={lang} />;
    case 'quiz':
      return (
        <div role="note" className="rounded-lg border border-dashed border-edge bg-surface p-4 text-sm text-ink-muted">
          <p className="font-semibold text-ink">{t({ en: 'Practice question coming soon', vi: 'Câu hỏi luyện tập sắp có' })}</p>
          <p className="mt-1">
            {t({
              en: 'This question will appear here once practice checking is ready.',
              vi: 'Câu hỏi sẽ hiện ở đây khi phần chấm luyện tập sẵn sàng.',
            })}
          </p>
        </div>
      );
    case 'interactive':
      return <InteractiveRenderer block={block} />;
    case 'term-ref':
      return <TermRefCard termId={block.term_id} lang={lang} />;
    case 'resource-ref':
      return <ResourceRefCard resourceId={block.resource_id} lang={lang} />;
    case 'image':
      return <ImageRenderer block={block} lang={lang} />;
    default:
      console.warn('BlockRenderer: unknown block type', (block as Block).type);
      return null;
  }
}
