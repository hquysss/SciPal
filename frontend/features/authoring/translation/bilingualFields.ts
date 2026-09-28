import type { Block } from '@scipal/types';
import type { QuestionDraft } from '../practice/questionDraft';

// The bilingual text an author writes, addressed by a path, so automatic translation can read
// and fill it without knowing each block or question type.

export type Bilingual = { vi: string; en: string };
export type Field = { path: string; text: Bilingual };

const BLOCK_PATHS: Partial<Record<Block['type'], string[]>> = {
  theory: ['content'],
  formula: ['caption'],
  image: ['alt', 'caption'],
  interactive: ['heading', 'caption'],
};

/** The block's bilingual fields that exist, in reading order. */
export function blockFields(block: Block): Field[] {
  const record = block as unknown as Record<string, Bilingual | undefined>;
  return (BLOCK_PATHS[block.type] ?? []).flatMap((path) => (record[path] ? [{ path, text: record[path]! }] : []));
}

export function setBlockField(block: Block, path: string, text: Bilingual): Block {
  return { ...block, [path]: text } as Block;
}

/** The question's bilingual fields; the short answer key is never translated. */
export function draftFields(draft: QuestionDraft): Field[] {
  const { stem, options, items, rubric, explanation } = draft.data;
  return [
    { path: 'stem', text: stem },
    ...(draft.type === 'mc' ? (options ?? []).map((o) => ({ path: `options.${o.id}`, text: o.text })) : []),
    ...(draft.type === 'truefalse' ? (items ?? []).map((o) => ({ path: `items.${o.id}`, text: o.text })) : []),
    ...(draft.type === 'short' && rubric ? [{ path: 'rubric', text: rubric }] : []),
    ...(explanation ? [{ path: 'explanation', text: explanation }] : []),
  ];
}

export function setDraftField(draft: QuestionDraft, path: string, text: Bilingual): QuestionDraft {
  const [head, id] = path.split('.');
  if (head === 'options' || head === 'items') {
    const list = (draft.data[head] ?? []) as Array<{ id: string; text: Bilingual }>;
    return { ...draft, data: { ...draft.data, [head]: list.map((o) => (o.id === id ? { ...o, text } : o)) } };
  }
  return { ...draft, data: { ...draft.data, [head]: text } };
}
