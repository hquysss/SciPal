'use client';

import { useLanguage } from '@scipal/hooks';
import type { Block, ImageBlock } from '@scipal/types';
import { CodeEditor } from './editors/CodeEditor';
import { FormulaEditor } from './editors/FormulaEditor';
import { ImageEditor } from './editors/ImageEditor';
import { RefPicker } from './editors/RefPicker';
import { TheoryEditor } from './editors/TheoryEditor';

export interface BlockEditorProps {
  block: Block;
  onChange: (block: Block) => void;
  /** Subject of the lesson, for term and resource search. */
  subjectId: string;
  /** Which language's text is being edited. */
  lang: 'vi' | 'en';
  onLangChange: (lang: 'vi' | 'en') => void;
  /** Insert an image block right after this one (an image pasted into theory text). */
  onInsertImage?: (image: ImageBlock) => void;
}

/** The editor for one block, chosen by its type. */
export function BlockEditor({ block, onChange, subjectId, lang, onLangChange, onInsertImage }: BlockEditorProps) {
  const { t } = useLanguage();
  const langProps = { lang, onLangChange };
  switch (block.type) {
    case 'theory':
      return <TheoryEditor block={block} onChange={onChange} onInsertImage={onInsertImage} {...langProps} />;
    case 'code':
      return <CodeEditor block={block} onChange={onChange} />;
    case 'formula':
      return <FormulaEditor block={block} onChange={onChange} {...langProps} />;
    case 'image':
      return <ImageEditor block={block} onChange={onChange} {...langProps} />;
    case 'term-ref':
      return <RefPicker kind="term" subjectId={subjectId} selectedId={block.term_id} onPick={(id) => onChange({ type: 'term-ref', term_id: id })} />;
    case 'resource-ref':
      return (
        <RefPicker kind="resource" subjectId={subjectId} selectedId={block.resource_id} onPick={(id) => onChange({ type: 'resource-ref', resource_id: id })} />
      );
    default:
      return (
        <p className="rounded-lg border border-dashed border-edge bg-surface-sunken p-3 text-sm text-ink-muted">
          {t({
            en: 'The editor for this block arrives in the next step. You can still reorder or remove it.',
            vi: 'Trình soạn cho khối này sẽ có ở bước tiếp theo. Bạn vẫn có thể sắp xếp hoặc xóa khối.',
          })}
        </p>
      );
  }
}
