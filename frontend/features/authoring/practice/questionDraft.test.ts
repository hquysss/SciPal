import { describe, expect, it } from 'vitest';
import { draftFromQuestion, draftProblem, emptyQuestion, questionInput, questionTypesFor, switchQuestionType, type QuestionDraft } from './questionDraft';

const ctx = { usage: 'practice' as const, subjectId: '11111111-1111-4111-8111-111111111111', lessonId: '22222222-2222-4222-8222-222222222222' };
const examCtx = { usage: 'exam' as const, subjectId: '11111111-1111-4111-8111-111111111111', grade: 11 };

function filled(type: QuestionDraft['type']): QuestionDraft {
  const draft = emptyQuestion(type);
  draft.data.stem = { vi: 'Câu hỏi?', en: 'Question?' };
  draft.data.options?.forEach((o, i) => (o.text = { vi: `PA ${i + 1}`, en: `Option ${i + 1}` }));
  draft.data.items?.forEach((it, i) => (it.text = { vi: `Ý ${i + 1}`, en: `Item ${i + 1}` }));
  if (type === 'short') draft.data.answer_key = 'Hà Nội';
  if (type === 'writing') draft.data.sample_answer = 'A loop repeats code.';
  return draft;
}

describe('question drafts', () => {
  it.each(['mc', 'truefalse', 'short', 'writing'] as const)('starts a %s question that is valid once its text is written', (type) => {
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

describe('writing question drafts', () => {
  it('sends the sample answer and the key terms, trimmed and without blanks or repeats', () => {
    const draft = filled('writing');
    draft.data.key_terms = [' loop ', '', 'repeat', 'loop'];
    const input = questionInput(draft, ctx);
    expect(input).toMatchObject({ type: 'writing', data: { sample_answer: 'A loop repeats code.', key_terms: ['loop', 'repeat'] } });
    expect(input.data).not.toHaveProperty('answer_key');
  });

  it('leaves key terms out when there are none', () => {
    expect(questionInput(filled('writing'), ctx).data).not.toHaveProperty('key_terms');
  });

  it('drops the sample answer and key terms when the type changes', () => {
    const draft = { ...filled('writing'), data: { ...filled('writing').data, key_terms: ['loop'] } };
    const mc = switchQuestionType(draft, 'mc');
    expect(mc.data).not.toHaveProperty('sample_answer');
    expect(mc.data).not.toHaveProperty('key_terms');
  });

  it('offers writing for lesson practice only', () => {
    expect(questionTypesFor('practice')).toContain('writing');
    expect(questionTypesFor('exam')).not.toContain('writing');
  });
});

describe('exam question drafts', () => {
  it('build an exam question with a grade and no lesson', () => {
    const input = questionInput(emptyQuestion('short'), examCtx);
    expect(input).toMatchObject({ usage: 'exam', grade: 11 });
    expect(input).not.toHaveProperty('lesson_id');
  });
});

describe('code question drafts', () => {
  const written = (): QuestionDraft => {
    const draft = emptyQuestion('code');
    draft.data.stem = { vi: 'Nhân đôi.', en: 'Double.' };
    draft.data.input_spec = { vi: 'n', en: 'n' };
    draft.data.output_spec = { vi: '2n', en: '2n' };
    draft.data.tests = [{ input: '2\n', expected: '4\n', sample: true, points: 1 }];
    return draft;
  };

  it('starts empty and is valid once the statement and a test are written', () => {
    expect(draftProblem(emptyQuestion('code'), ctx)).not.toBeNull();
    expect(draftProblem(written(), ctx)).toBeNull();
  });

  it('starts with one example test and the default limits', () => {
    const { data } = emptyQuestion('code');
    expect(data.tests).toEqual([{ input: '', expected: '', sample: true, points: 1 }]);
    expect(data).toMatchObject({ time_limit_ms: 2000, memory_limit_mb: 128 });
  });

  it('sends the code fields, with only the starter code that was written', () => {
    const draft = written();
    draft.data.starter = { python: 'n = int(input())\n', cpp: '  ' };
    expect(questionInput(draft, ctx).data).toMatchObject({
      input_spec: { vi: 'n', en: 'n' },
      time_limit_ms: 2000,
      tests: [{ input: '2\n', expected: '4\n', sample: true, points: 1 }],
      starter: { python: 'n = int(input())\n' },
    });
  });

  it('asks for an example test', () => {
    const draft = written();
    draft.data.tests = [{ input: '2\n', expected: '4\n', sample: false, points: 1 }];
    expect(draftProblem(draft, ctx)).not.toBeNull();
  });

  it('is for lesson practice only, and drops its tests when the type changes', () => {
    expect(questionTypesFor('practice')).toContain('code');
    expect(questionTypesFor('exam')).not.toContain('code');
    const mc = switchQuestionType(written(), 'mc');
    expect(mc.data).not.toHaveProperty('tests');
    expect(mc.data.stem).toEqual({ vi: 'Nhân đôi.', en: 'Double.' });
  });
});
