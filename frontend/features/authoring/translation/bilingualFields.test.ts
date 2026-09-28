import { describe, expect, it } from 'vitest';
import type { Block } from '@scipal/types';
import { emptyQuestion } from '../practice/questionDraft';
import { blockFields, draftFields, lessonFields, setBlockField, setDraftField, setLessonField } from './bilingualFields';

const t = (vi: string, en = '') => ({ vi, en });

describe('blockFields', () => {
  it('lists the bilingual text of each block type', () => {
    expect(blockFields({ type: 'theory', content: t('Lý thuyết') })).toEqual([{ path: 'content', text: t('Lý thuyết') }]);
    expect(blockFields({ type: 'formula', katex: 'x' })).toEqual([]);
    expect(blockFields({ type: 'formula', katex: 'x', caption: t('Chú thích') }).map((f) => f.path)).toEqual(['caption']);
    expect(blockFields({ type: 'image', url: 'u', alt: t('Mô tả'), caption: t('Ảnh') }).map((f) => f.path)).toEqual(['alt', 'caption']);
    expect(blockFields({ type: 'interactive', kind: 'embed', heading: t('Tiêu đề'), caption: t('C'), offline: false, config: {} } as Block).map((f) => f.path)).toEqual(['heading', 'caption']);
    expect(blockFields({ type: 'code', tabs: [{ lang: 'python', code: 'x' }] })).toEqual([]);
    expect(blockFields({ type: 'quiz', question_id: 'q' })).toEqual([]);
  });

  it('sets a field without touching the original block', () => {
    const block: Block = { type: 'theory', content: t('A') };
    const next = setBlockField(block, 'content', t('A', 'B'));
    expect(next).toEqual({ type: 'theory', content: t('A', 'B') });
    expect(block).toEqual({ type: 'theory', content: t('A') });
  });
});

describe('draftFields', () => {
  it('lists stem, options and explanation of a multiple-choice question', () => {
    const d = emptyQuestion('mc');
    d.data.explanation = t('Vì');
    expect(draftFields(d).map((f) => f.path)).toEqual(['stem', 'options.a', 'options.b', 'options.c', 'options.d', 'explanation']);
  });

  it('lists statements of a true/false question and the note of a short one, never the answer key', () => {
    expect(draftFields(emptyQuestion('truefalse')).map((f) => f.path)).toEqual(['stem', 'items.1', 'items.2', 'items.3', 'items.4']);
    const short = emptyQuestion('short');
    short.data.answer_key = '42';
    short.data.rubric = t('Ghi chú');
    expect(draftFields(short).map((f) => f.path)).toEqual(['stem', 'rubric']);
  });

  it('sets an option by id immutably', () => {
    const d = emptyQuestion('mc');
    const next = setDraftField(d, 'options.b', t('Hai', 'Two'));
    expect(next.data.options![1].text).toEqual(t('Hai', 'Two'));
    expect(d.data.options![1].text).toEqual(t(''));
    expect(setDraftField(d, 'stem', t('Câu', 'Q')).data.stem).toEqual(t('Câu', 'Q'));
  });
});

describe('lessonFields', () => {
  it('keys the title and each block field by its place in the lesson', () => {
    const doc = { title: t('Bài', ''), blocks: [{ type: 'code', tabs: [] } as unknown as Block, { type: 'theory', content: t('A') } as Block] };
    expect(lessonFields(doc).map((f) => f.key)).toEqual(['title', '1:content']);
    const next = setLessonField(setLessonField(doc, 'title', t('Bài', 'Lesson')), '1:content', t('A', 'B'));
    expect(next.title.en).toBe('Lesson');
    expect((next.blocks[1] as { content: unknown }).content).toEqual(t('A', 'B'));
    expect(next.blocks[0]).toBe(doc.blocks[0]);
    expect(setLessonField(doc, '9:content', t('x', 'y'))).toEqual(doc);
  });
});
