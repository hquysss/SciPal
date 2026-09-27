import { describe, expect, it } from 'vitest';
import { draftFromQuestion, draftProblem, emptyQuestion, questionInput, switchQuestionType, type QuestionDraft } from './questionDraft';

const ctx = { usage: 'practice' as const, subjectId: '11111111-1111-4111-8111-111111111111', lessonId: '22222222-2222-4222-8222-222222222222' };
const examCtx = { usage: 'exam' as const, subjectId: '11111111-1111-4111-8111-111111111111', grade: 11 };

function filled(type: QuestionDraft['type']): QuestionDraft {
  const draft = emptyQuestion(type);
  draft.data.stem = { vi: 'Câu hỏi?', en: 'Question?' };
  draft.data.options?.forEach((o, i) => (o.text = { vi: `PA ${i + 1}`, en: `Option ${i + 1}` }));
  draft.data.items?.forEach((it, i) => (it.text = { vi: `Ý ${i + 1}`, en: `Item ${i + 1}` }));
  if (type === 'short') draft.data.answer_key = 'Hà Nội';
  return draft;
}

describe('question drafts', () => {
  it.each(['mc', 'truefalse', 'short'] as const)('starts a %s question that is valid once its text is written', (type) => {
    expect(draftProblem(emptyQuestion(type), ctx)).not.toBeNull();
    expect(draftProblem(filled(type), ctx)).toBeNull();
  });

  it('starts a multiple-choice question with four options and the first one correct', () => {
    const draft = emptyQuestion('mc');
    expect(draft.data.options!.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(draft.data.answer).toBe('a');
  });

  it('keeps the question text and explanation but drops the old answer when the type changes', () => {
    const mc = { ...filled('mc'), difficulty: 3 as const };
    mc.data.explanation = { vi: 'Vì', en: 'Because' };
    const short = switchQuestionType(mc, 'short');
    expect(short.type).toBe('short');
    expect(short.difficulty).toBe(3);
    expect(short.data.stem).toEqual(mc.data.stem);
    expect(short.data.explanation).toEqual(mc.data.explanation);
    expect(short.data).not.toHaveProperty('options');
    expect(short.data).not.toHaveProperty('answer');
    const tf = switchQuestionType(short, 'truefalse');
    expect(tf.data).not.toHaveProperty('answer_key');
    expect(tf.data.items).toHaveLength(4);
  });

  it('sends only the fields of its type, with an empty explanation left out', () => {
    const draft = filled('truefalse');
    (draft.data as Record<string, unknown>).answer = 'a';
    draft.data.explanation = { vi: ' ', en: '' };
    const input = questionInput(draft, ctx);
    expect(input).toMatchObject({ usage: 'practice', subject_id: ctx.subjectId, lesson_id: ctx.lessonId, type: 'truefalse' });
    expect(input.data).not.toHaveProperty('answer');
    expect(input.data).not.toHaveProperty('explanation');
  });

  it('explains what is wrong in both languages', () => {
    const draft = filled('mc');
    draft.data.options![1]!.text.vi = '';
    expect(draftProblem(draft, ctx)).toEqual({ vi: expect.stringMatching(/phương án/), en: expect.stringMatching(/options/) });
  });

  it('reopens an imported short question with its key in the answer field', () => {
    const draft = draftFromQuestion({ type: 'short', difficulty: 1, data: { stem: { vi: 'A', en: 'B' }, answer: '42' } });
    expect(draft.data.answer_key).toBe('42');
    expect(draft.data).not.toHaveProperty('answer');
  });

  it('reopens a saved question for editing', () => {
    const draft = draftFromQuestion({ type: 'short', difficulty: 2, data: { stem: { vi: 'A', en: 'B' }, answer_key: 'x' } });
    expect(draft).toEqual({ type: 'short', difficulty: 2, data: { stem: { vi: 'A', en: 'B' }, answer_key: 'x' } });
  });
});

describe('exam question drafts', () => {
  it('build an exam question with a grade and no lesson', () => {
    const input = questionInput(emptyQuestion('short'), examCtx);
    expect(input).toMatchObject({ usage: 'exam', grade: 11 });
    expect(input).not.toHaveProperty('lesson_id');
  });
});
