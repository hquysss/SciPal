import { describe, expect, it } from 'vitest';
import { buildLayout, type ExamSection, type TemplateKey } from '../schemas/examFormat.js';
import { scoreExam, trueFalseCredit, type ExamAnswer } from './scoring.js';

type Q = { id: string; type: string; data: Record<string, any> };

// Fake key check: an answer is right when it carries the marker the test put on it.
const isCorrect = (_q: { type: string; data: Record<string, any> }, a: ExamAnswer) => a.selected_option === 'right';

const tfItems = () => [1, 2, 3, 4].map((n) => ({ id: `s${n}`, correct: true }));

/** Fills a template layout with fresh questions; returns the layout and the questions in order. */
function filled(key: TemplateKey): { layout: ExamSection[]; questions: Q[]; bySection: Record<string, Q[]> } {
  const layout = buildLayout(key);
  const questions: Q[] = [];
  const bySection: Record<string, Q[]> = {};
  for (const section of layout) {
    bySection[section.key] = [];
    for (let i = 0; i < section.count; i++) {
      const q: Q = {
        id: `${section.key}-${i}`,
        type: section.kind,
        data: section.kind === 'truefalse' ? { items: tfItems() } : {},
      };
      section.groups[0]!.question_ids.push(q.id);
      questions.push(q);
      bySection[section.key]!.push(q);
    }
  }
  return { layout, questions, bySection };
}

const rightAnswer = (q: Q): ExamAnswer =>
  q.type === 'truefalse'
    ? { question_id: q.id, items: tfItems().map((i) => ({ id: i.id, selected: i.correct })) }
    : { question_id: q.id, selected_option: 'right' };

const answersFor = (qs: Q[]) => new Map(qs.map((q) => [q.id, rightAnswer(q)]));

// Key check close to the real one, so true/false questions behave as in the old route.
const keyCheck = (q: { type: string; data: Record<string, any> }, a: ExamAnswer) => {
  if (q.type === 'truefalse') {
    return (q.data.items as Array<{ id: string; correct: boolean }>).every((it) => a.items?.find((x) => x.id === it.id)?.selected === it.correct);
  }
  return isCorrect(q, a);
};

describe('trueFalseCredit', () => {
  it('uses the official ladder for four statements', () => {
    expect([0, 1, 2, 3, 4].map((n) => trueFalseCredit(n, 4))).toEqual([0, 0.1, 0.25, 0.5, 1]);
  });

  it('uses the share of right statements for any other count', () => {
    expect(trueFalseCredit(1, 2)).toBe(0.5);
    expect(trueFalseCredit(3, 3)).toBe(1);
    expect(trueFalseCredit(0, 0)).toBe(0);
  });
});

describe('scoreExam: generic', () => {
  const questions: Q[] = [1, 2, 3, 4].map((n) => ({ id: `q${n}`, type: 'mc', data: {} }));

  it('scores out of 10 with no sections', () => {
    const answers = answersFor(questions.slice(0, 3));
    const result = scoreExam({ format: 'generic', layout: null, questions, answers, isCorrect });
    expect(result).toEqual({ score: 7.5, max_score: 10, correct_count: 3, total_questions: 4, estimated: false, sections: [] });
  });

  it('scores 0 for an exam without questions', () => {
    const result = scoreExam({ format: 'generic', layout: null, questions: [], answers: new Map(), isCorrect });
    expect(result.score).toBe(0);
    expect(result.max_score).toBe(10);
  });

  it('scores as generic when a non-generic format has no layout', () => {
    const answers = answersFor(questions.slice(0, 3));
    const result = scoreExam({ format: 'thptqg', layout: null, questions, answers, isCorrect });
    expect(result).toEqual({ score: 7.5, max_score: 10, correct_count: 3, total_questions: 4, estimated: false, sections: [] });
    const dgnl = scoreExam({ format: 'dgnl_hcm', layout: null, questions, answers, isCorrect });
    expect(dgnl.estimated).toBe(false);
    expect(dgnl.max_score).toBe(10);
  });
});

describe('scoreExam: thptqg', () => {
  it('math: everything right is 10', () => {
    const { layout, questions } = filled('thptqg:math');
    const result = scoreExam({ format: 'thptqg', layout, questions, answers: answersFor(questions), isCorrect: keyCheck });
    expect(result.score).toBe(10);
    expect(result.max_score).toBe(10);
    expect(result.estimated).toBe(false);
    expect(result.correct_count).toBe(22);
    expect(result.total_questions).toBe(22);
    expect(result.sections.map((s) => [s.key, s.score, s.max_score, s.correct, s.total])).toEqual([
      ['mc', 3, 3, 12, 12],
      ['truefalse', 4, 4, 4, 4],
      ['short', 3, 3, 6, 6],
    ]);
  });

  it('math: only part III right is 3', () => {
    const { layout, questions, bySection } = filled('thptqg:math');
    const result = scoreExam({ format: 'thptqg', layout, questions, answers: answersFor(bySection.short!), isCorrect: keyCheck });
    expect(result.score).toBe(3);
    expect(result.correct_count).toBe(6);
  });

  it('math: two of four statements right on every part II question is 1', () => {
    const { layout, questions, bySection } = filled('thptqg:math');
    const answers = new Map(
      bySection.truefalse!.map((q) => [
        q.id,
        { question_id: q.id, items: [{ id: 's1', selected: true }, { id: 's2', selected: true }, { id: 's3', selected: false }, { id: 's4', selected: false }] } as ExamAnswer,
      ]),
    );
    const result = scoreExam({ format: 'thptqg', layout, questions, answers, isCorrect: keyCheck });
    const part = result.sections.find((s) => s.key === 'truefalse')!;
    expect(part.score).toBe(1);
    expect(part.correct).toBe(0);
    expect(result.score).toBe(1);
    expect(result.correct_count).toBe(0);
  });

  it('science 18/4/6: everything right is 10', () => {
    const { layout, questions } = filled('thptqg:science');
    const result = scoreExam({ format: 'thptqg', layout, questions, answers: answersFor(questions), isCorrect: keyCheck });
    expect(result.score).toBe(10);
    expect(result.sections.map((s) => s.max_score)).toEqual([4.5, 4, 1.5]);
  });

  it('rounds scores to two decimals', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    // 3 points x 1 right of 7 = 0.428...
    const result = scoreExam({
      format: 'thptqg',
      layout: [{ key: 'mc', title: { vi: '', en: '' }, kind: 'mc', count: 7, max_points: 3, groups: [{ question_ids: ids }] }],
      questions: ids.map((id) => ({ id, type: 'mc', data: {} })),
      answers: new Map([['a', { question_id: 'a', selected_option: 'right' }]]),
      isCorrect,
    });
    expect(result.score).toBe(0.43);
    expect(result.sections[0]!.score).toBe(0.43);
  });
});

describe('scoreExam: dgnl_hcm', () => {
  it('all right is 1200 and estimated', () => {
    const { layout, questions } = filled('dgnl_hcm');
    const result = scoreExam({ format: 'dgnl_hcm', layout, questions, answers: answersFor(questions), isCorrect });
    expect(result.score).toBe(1200);
    expect(result.max_score).toBe(1200);
    expect(result.estimated).toBe(true);
    expect(result.sections).toHaveLength(4);
  });

  it('15 of 30 right in math is 150 for that section', () => {
    const { layout, questions, bySection } = filled('dgnl_hcm');
    const result = scoreExam({ format: 'dgnl_hcm', layout, questions, answers: answersFor(bySection.math!.slice(0, 15)), isCorrect });
    expect(result.sections.find((s) => s.key === 'math')!.score).toBe(150);
    expect(result.score).toBe(150);
    expect(result.estimated).toBe(true);
  });
});

describe('scoreExam: edge cases', () => {
  it('a section without questions scores 0, never NaN', () => {
    const { layout, questions } = filled('thptqg:math');
    layout[2]!.groups[0]!.question_ids = [];
    const kept = questions.filter((q) => !q.id.startsWith('short-'));
    const result = scoreExam({ format: 'thptqg', layout, questions: kept, answers: answersFor(kept), isCorrect: keyCheck });
    const empty = result.sections.find((s) => s.key === 'short')!;
    expect(empty.score).toBe(0);
    expect(Number.isNaN(empty.score)).toBe(false);
    expect(empty.total).toBe(0);
    expect(result.score).toBe(7);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('ignores an answer to a question outside the layout', () => {
    const { layout, questions } = filled('thptqg:math');
    const answers = answersFor(questions);
    answers.set('stranger', { question_id: 'stranger', selected_option: 'right' });
    const result = scoreExam({
      format: 'thptqg',
      layout,
      questions: [...questions, { id: 'stranger', type: 'mc', data: {} }],
      answers,
      isCorrect: keyCheck,
    });
    expect(result.score).toBe(10);
    expect(result.total_questions).toBe(22);
    expect(result.correct_count).toBe(22);
  });

  it('counts only the statement ids the question has, for true/false', () => {
    const layout: ExamSection[] = [
      { key: 'truefalse', title: { vi: '', en: '' }, kind: 'truefalse', count: 1, max_points: 4, groups: [{ question_ids: ['t1'] }] },
    ];
    const questions: Q[] = [{ id: 't1', type: 'truefalse', data: { items: tfItems() } }];
    // s1 and s2 right, s3 omitted, s4 wrong, unknown id "zz" ignored: 2 of 4 right = 0.25 of 4 points.
    const answers = new Map<string, ExamAnswer>([
      ['t1', { question_id: 't1', items: [{ id: 's1', selected: true }, { id: 's2', selected: true }, { id: 'zz', selected: true }, { id: 's4', selected: false }] }],
    ]);
    const result = scoreExam({ format: 'thptqg', layout, questions, answers, isCorrect: keyCheck });
    expect(result.sections[0]!.score).toBe(1);
    expect(result.score).toBe(1);
  });
});
