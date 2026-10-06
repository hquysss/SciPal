import { storedQuestionData, validateQuestionInput, type QuestionType } from '@scipal/types';
import type { QuestionPayload } from './api';

type Bilingual = { en: string; vi: string };

/** A question while the teacher writes it: loose enough to hold half-written text. */
export interface QuestionDraft {
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  data: {
    stem: Bilingual;
    options?: Array<{ id: string; text: Bilingual }>;
    answer?: string;
    items?: Array<{ id: string; text: Bilingual; correct: boolean }>;
    answer_key?: string;
    rubric?: Bilingual;
    explanation?: Bilingual;
    /** A figure under the question, uploaded to SciPal. */
    image?: { url: string; alt?: Bilingual };
    source?: string;
  };
}

const blank = (): Bilingual => ({ vi: '', en: '' });

export const QUESTION_TYPE_LABEL: Record<QuestionType, Bilingual> = {
  mc: { en: 'Multiple choice', vi: 'Trắc nghiệm' },
  truefalse: { en: 'True / false', vi: 'Đúng / sai' },
  short: { en: 'Short answer', vi: 'Trả lời ngắn' },
};

/** Answer fields of a fresh question of this type. */
function answerFields(type: QuestionType): Omit<QuestionDraft['data'], 'stem' | 'explanation' | 'rubric'> {
  if (type === 'mc') return { options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: blank() })), answer: 'a' };
  if (type === 'truefalse') return { items: ['1', '2', '3', '4'].map((id) => ({ id, text: blank(), correct: true })) };
  return { answer_key: '' };
}

export function emptyQuestion(type: QuestionType): QuestionDraft {
  return { type, difficulty: 1, data: { stem: blank(), ...answerFields(type) } };
}

/** Another type keeps the question text, difficulty, explanation, figure and source; the old answer goes. */
export function switchQuestionType(draft: QuestionDraft, type: QuestionType): QuestionDraft {
  const { stem, explanation, image, source } = draft.data;
  return {
    type,
    difficulty: draft.difficulty,
    data: { stem, ...(explanation ? { explanation } : {}), ...(image ? { image } : {}), ...(source ? { source } : {}), ...answerFields(type) },
  };
}

/** A saved question, reopened for editing. */
export function draftFromQuestion(row: { type: QuestionType; difficulty: number; data: Record<string, unknown> }): QuestionDraft {
  const difficulty = (row.difficulty === 2 || row.difficulty === 3 ? row.difficulty : 1) as 1 | 2 | 3;
  return { type: row.type, difficulty, data: structuredClone(storedQuestionData(row.type, row.data)) as QuestionDraft['data'] };
}

/** A new id for an added option or statement, unused in the list. */
export function nextChoiceId(ids: string[], numeric: boolean): string {
  if (numeric) return String(Math.max(0, ...ids.map((id) => Number(id) || 0)) + 1);
  return 'abcdefghij'.split('').find((id) => !ids.includes(id)) ?? `x${ids.length + 1}`;
}

const written = (text: Bilingual | undefined) => !!text && (text.vi.trim() !== '' || text.en.trim() !== '');

/** Where a question lives: a lesson's practice part, or the exam bank (with an optional grade). */
export type QuestionContext = { subjectId: string } & ({ usage: 'practice'; lessonId: string } | { usage: 'exam'; grade: number | null });

/** What the API receives: only this type's fields; an unwritten explanation or note is left out. */
export function questionInput(draft: QuestionDraft, ctx: QuestionContext): QuestionPayload {
  const { stem, options, answer, items, answer_key, rubric, explanation, image, source } = draft.data;
  const extra = {
    ...(written(explanation) ? { explanation } : {}),
    ...(image?.url ? { image } : {}),
    ...(source?.trim() ? { source: source.trim() } : {}),
  };
  const data =
    draft.type === 'mc'
      ? { stem, options, answer, ...extra }
      : draft.type === 'truefalse'
        ? { stem, items, ...extra }
        : { stem, answer_key, ...(written(rubric) ? { rubric } : {}), ...extra };
  const place = ctx.usage === 'practice' ? { usage: 'practice' as const, lesson_id: ctx.lessonId } : { usage: 'exam' as const, grade: ctx.grade };
  return { ...place, subject_id: ctx.subjectId, type: draft.type, difficulty: draft.difficulty, data };
}

/** Why the question cannot be saved yet, or null. English may wait until the lesson or exam is sent for review. */
export function draftProblem(draft: QuestionDraft, ctx: QuestionContext): Bilingual | null {
  const checked = validateQuestionInput(questionInput(draft, ctx));
  return checked.ok ? null : checked.message;
}
