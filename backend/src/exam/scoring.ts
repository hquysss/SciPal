import type { ExamFormat, ExamSection } from '../schemas/examFormat.js';

export interface ExamAnswer {
  question_id: string;
  selected_option?: string;
  items?: Array<{ id: string; selected: boolean }>;
  short_answer?: string;
}

export interface ScoredSection {
  key: string;
  score: number;
  max_score: number;
  /** Questions that earned full credit. */
  correct: number;
  total: number;
}

export interface ExamScore {
  score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  estimated: boolean;
  sections: ScoredSection[];
}

type ScorableQuestion = { id: string; type: string; data: Record<string, any> };
type KeyCheck = (q: { type: string; data: Record<string, any> }, a: ExamAnswer) => boolean;

/** Official THPTQG part II ladder: 1 right statement of 4 earns 0.1, 2 earn 0.25, 3 earn 0.5, 4 earn all. */
const TRUE_FALSE_LADDER = [0, 0.1, 0.25, 0.5, 1];

export function trueFalseCredit(correctStatements: number, statements: number): number {
  if (statements === 4) return TRUE_FALSE_LADDER[Math.max(0, Math.min(4, correctStatements))] ?? 0;
  return statements > 0 ? correctStatements / statements : 0;
}

/** A format whose score is an estimate, not an official mark. */
export const isEstimatedFormat = (format: ExamFormat) => format === 'dgnl_hcm';

const round2 = (n: number) => Number(n.toFixed(2));

/** Credit (0..1) one answer earns on one question. A missing answer earns nothing. */
function questionCredit(question: ScorableQuestion, answer: ExamAnswer | undefined, isCorrect: KeyCheck): number {
  if (!answer) return 0;
  if (question.type === 'truefalse') {
    const items: Array<{ id: string; correct: boolean }> = Array.isArray(question.data.items) ? question.data.items : [];
    const given = Array.isArray(answer.items) ? answer.items : [];
    // Only the question's own statements count: unknown ids are ignored, omitted ones are wrong.
    const right = items.filter((it) => given.find((g) => g?.id === it.id)?.selected === it.correct).length;
    return trueFalseCredit(right, items.length);
  }
  return isCorrect(question, answer) ? 1 : 0;
}

/**
 * Scores an exam on the server. A generic exam (or a format without a layout) is out of 10 over
 * every question; a laid-out exam scores each section as max_points x credit / questions in the
 * section, so a question missing from the loaded set counts as unanswered.
 */
export function scoreExam(input: {
  format: ExamFormat;
  layout: ExamSection[] | null;
  questions: ScorableQuestion[];
  answers: Map<string, ExamAnswer>;
  isCorrect: KeyCheck;
}): ExamScore {
  const { format, layout, questions, answers, isCorrect } = input;
  const byId = new Map(questions.map((q) => [q.id, q]));

  if (format === 'generic' || !layout) {
    let correct = 0;
    for (const q of questions) {
      const a = answers.get(q.id);
      if (a && isCorrect(q, a)) correct++;
    }
    const total = questions.length;
    return {
      score: total > 0 ? round2((correct / total) * 10) : 0,
      max_score: 10,
      correct_count: correct,
      total_questions: total,
      estimated: false,
      sections: [],
    };
  }

  const sections: ScoredSection[] = [];
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let totalQuestions = 0;
  for (const section of layout) {
    const ids = section.groups.flatMap((g) => g.question_ids);
    let credit = 0;
    let full = 0;
    for (const id of ids) {
      const question = byId.get(id);
      if (!question) continue;
      const c = questionCredit(question, answers.get(id), isCorrect);
      credit += c;
      if (c >= 1) full++;
    }
    const sectionScore = ids.length > 0 ? (section.max_points * credit) / ids.length : 0;
    sections.push({ key: section.key, score: round2(sectionScore), max_score: section.max_points, correct: full, total: ids.length });
    score += sectionScore;
    maxScore += section.max_points;
    correctCount += full;
    totalQuestions += ids.length;
  }

  return {
    score: round2(score),
    max_score: round2(maxScore),
    correct_count: correctCount,
    total_questions: totalQuestions,
    estimated: isEstimatedFormat(format),
    sections,
  };
}
