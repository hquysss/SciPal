'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { Block } from '@scipal/types';
import type { BlocksUpdate, LessonPart } from '@/features/lessons/lessonParts';
import { BlockEditor } from './BlockEditor';
import { duplicateAt, emptyBlock, insertAt, moveBlock, removeAt, type LessonBlockType } from './blockOps';
import { ImageDropZone } from './editors/ImageEditor';
import { RefPicker } from './editors/RefPicker';
import { SMALL_BUTTON } from './editors/styles';

type Bilingual = { en: string; vi: string };

const TYPE_LABEL: Record<Block['type'], Bilingual> = {
  theory: { en: 'Theory', vi: 'Lý thuyết' },
  code: { en: 'Code', vi: 'Mã nguồn' },
  formula: { en: 'Formula', vi: 'Công thức' },
  image: { en: 'Image', vi: 'Ảnh' },
  'term-ref': { en: 'Glossary term', vi: 'Thuật ngữ' },
  'resource-ref': { en: 'Resource', vi: 'Tài nguyên' },
  interactive: { en: 'Simulation', vi: 'Mô phỏng' },
  quiz: { en: 'Question', vi: 'Câu hỏi' },
};

const LESSON_TYPES: LessonBlockType[] = ['theory', 'code', 'formula', 'image', 'term-ref', 'resource-ref'];

const EMPTY_TEXT: Record<LessonPart, Bilingual> = {
  lesson: {
    en: 'The lesson has no content yet. Press ＋ to add the first block, or import a Word/PDF file.',
    vi: 'Bài chưa có nội dung. Bấm ＋ để thêm khối đầu tiên, hoặc nhập từ Word/PDF.',
  },
  simulation: {
    en: 'No simulations yet. The simulation editor arrives in the next step.',
    vi: 'Chưa có mô phỏng. Trình soạn mô phỏng sẽ có ở bước tiếp theo.',
  },
  practice: {
    en: 'No practice questions yet. The question editor arrives in the next step.',
    vi: 'Chưa có câu tự luyện. Trình soạn câu hỏi sẽ có ở bước tiếp theo.',
  },
};

function summary(block: Block, lang: 'en' | 'vi'): string {
  switch (block.type) {
    case 'theory':
      return (block.content[lang] || block.content.vi).split('\n').find((line) => line.trim()) ?? '';
    case 'code':
      return block.tabs.map((tab) => tab.lang).join(', ');
    case 'formula':
      return block.katex;
    case 'image':
      return block.alt[lang] || block.alt.vi;
    case 'interactive':
      return block.heading[lang] || block.heading.vi;
    default:
      return '';
  }
}

interface BlockListProps {
  part: LessonPart;
  /** The blocks of this part only. */
  blocks: Block[];
  /** Receives a function of the current blocks, never a copy taken earlier. */
  onChange: (update: BlocksUpdate) => void;
  subjectId: string;
  readOnly: boolean;
  /** Open and scroll to this block (from the issue list). */
  focusIndex?: number;
}

type Pending = { index: number; kind: 'image' | 'term-ref' | 'resource-ref' };

export function BlockList({ part, blocks, onChange, subjectId, readOnly, focusIndex }: BlockListProps) {
  const { t, lang: uiLang } = useLanguage();
  const [expanded, setExpanded] = useState<number | null>(focusIndex ?? null);
  const [menuAt, setMenuAt] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [undo, setUndo] = useState<{ block: Block; index: number } | null>(null);
  const [editLang, setEditLang] = useState<'vi' | 'en'>('vi');
  const cards = useRef<Array<HTMLLIElement | null>>([]);
  const canInsert = !readOnly && part === 'lesson';

  useEffect(() => {
    if (focusIndex === undefined) return;
    setExpanded(focusIndex);
    cards.current[focusIndex]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusIndex]);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(timer);
  }, [undo]);

  const insert = (index: number, block: Block) => {
    onChange((list) => insertAt(list, Math.min(index, list.length), block));
    setExpanded(index);
    setMenuAt(null);
    setPending(null);
  };

  const choose = (index: number, type: LessonBlockType) => {
    const block = emptyBlock(type);
    if (block) insert(index, block);
    else {
      setPending({ index, kind: type as Pending['kind'] });
      setMenuAt(null);
    }
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= blocks.length) return;
    onChange((list) => moveBlock(list, from, to));
    if (expanded === from) setExpanded(to);
  };

  const remove = (index: number) => {
    const removed = blocks[index];
    if (!removed) return;
    onChange((list) => removeAt(list, index).list);
    setUndo({ block: removed, index });
    setExpanded(null);
  };

  const insertRow = (index: number) => {
    if (!canInsert) return null;
    const open = menuAt === index;
    return (
      <li className="flex flex-col gap-2">
        <div className="group flex items-center gap-2">
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <button
            type="button"
            aria-label={t({ en: 'Insert a block here', vi: 'Chèn khối tại đây' })}
            aria-expanded={open}
            onClick={() => setMenuAt(open ? null : index)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:border-action hover:text-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
        </div>
        {open && (
          <div role="menu" className="flex flex-wrap justify-center gap-1.5">
            {LESSON_TYPES.map((type) => (
              <button key={type} type="button" role="menuitem" onClick={() => choose(index, type)} className={SMALL_BUTTON}>
                {t(TYPE_LABEL[type])}
              </button>
            ))}
          </div>
        )}
        {pending?.index === index && (
          <div className="rounded-lg border border-line bg-surface p-3">
            {pending.kind === 'image' ? (
              <ImageDropZone onImage={(image) => insert(index, image)} />
            ) : (
              <RefPicker
                kind={pending.kind === 'term-ref' ? 'term' : 'resource'}
                subjectId={subjectId}
                onPick={(id) => insert(index, pending.kind === 'term-ref' ? { type: 'term-ref', term_id: id } : { type: 'resource-ref', resource_id: id })}
              />
            )}
            <button type="button" onClick={() => setPending(null)} className={`${SMALL_BUTTON} mt-2`}>
              {t({ en: 'Cancel', vi: 'Hủy' })}
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3" role="tabpanel" id={`editor-panel-${part}`} aria-labelledby={`editor-tab-${part}`}>
      {blocks.length === 0 && <p className="rounded-lg border border-dashed border-edge bg-surface p-6 text-center text-sm text-ink-muted">{t(EMPTY_TEXT[part])}</p>}
      <ol className="flex flex-col gap-3">
        {insertRow(0)}
        {blocks.map((block, i) => {
          const open = expanded === i && !readOnly;
          return (
            <Fragment key={i}>
            <li
              ref={(el) => {
                cards.current[i] = el;
              }}
              onDragOver={(e) => {
                if (dragFrom !== null) e.preventDefault();
              }}
              onDrop={(e) => {
                // Only block drags started at a handle; text dropped into an editor is left alone.
                if (dragFrom === null) return;
                e.preventDefault();
                move(dragFrom, i);
                setDragFrom(null);
              }}
              className={`rounded-lg border bg-surface transition-colors ${open ? 'border-action' : 'border-line'} ${dragFrom === i ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 p-2.5">
                {!readOnly && (
                  <span
                    draggable
                    aria-hidden="true"
                    title={t({ en: 'Drag to reorder', vi: 'Kéo để sắp xếp' })}
                    onDragStart={(e) => {
                      setDragFrom(i);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(i + 1));
                      const card = cards.current[i];
                      if (card) e.dataTransfer.setDragImage(card, 16, 16);
                    }}
                    onDragEnd={() => setDragFrom(null)}
                    className="inline-flex h-9 w-6 shrink-0 cursor-grab items-center justify-center text-ink-muted active:cursor-grabbing"
                  >
                    <GripVertical aria-hidden="true" className="h-4 w-4" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : i)}
                  aria-expanded={open}
                  disabled={readOnly}
                  className="flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-sunken text-xs font-bold tabular-nums text-ink-muted">{i + 1}</span>
                  <span className="shrink-0 text-sm font-semibold text-ink">{t(TYPE_LABEL[block.type])}</span>
                  <span className="truncate text-sm text-ink-muted">{summary(block, uiLang)}</span>
                </button>
                {!readOnly && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton label={t({ en: 'Move up', vi: 'Lên trên' })} disabled={i === 0} onClick={() => move(i, i - 1)} Icon={ArrowUp} />
                    <IconButton label={t({ en: 'Move down', vi: 'Xuống dưới' })} disabled={i === blocks.length - 1} onClick={() => move(i, i + 1)} Icon={ArrowDown} />
                    <IconButton
                      label={t({ en: 'Duplicate', vi: 'Nhân đôi' })}
                      onClick={() => {
                        onChange((list) => duplicateAt(list, i));
                        setExpanded(i + 1);
                      }}
                      Icon={Copy}
                    />
                    <IconButton label={t({ en: 'Delete block', vi: 'Xóa khối' })} onClick={() => remove(i)} Icon={Trash2} danger />
                  </div>
                )}
              </div>
              {open && (
                <div className="border-t border-line p-3">
                  <BlockEditor
                    block={block}
                    onChange={(next) => onChange((list) => list.map((b, j) => (j === i ? next : b)))}
                    subjectId={subjectId}
                    lang={editLang}
                    onLangChange={setEditLang}
                    onInsertImage={(image) => onChange((list) => insertAt(list, Math.min(i + 1, list.length), image))}
                  />
                </div>
              )}
            </li>
            {insertRow(i + 1)}
            </Fragment>
          );
        })}
      </ol>
      {undo && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-line bg-surface px-4 py-2 text-sm text-ink shadow-lg">
          {t({ en: 'Block deleted', vi: 'Đã xóa khối' })}
          <button
            type="button"
            onClick={() => {
              onChange((list) => insertAt(list, Math.min(undo.index, list.length), undo.block));
              setUndo(null);
            }}
            className="font-semibold text-action underline-offset-4 hover:underline"
          >
            {t({ en: 'Undo', vi: 'Hoàn tác' })}
          </button>
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  Icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  Icon: typeof Plus;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken disabled:opacity-30 ${danger ? 'hover:text-danger' : 'hover:text-ink'}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}
