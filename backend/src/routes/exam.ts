import type { FastifyPluginAsync } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  BLUEPRINT_COLUMNS,
  blueprintQuestionIds,
  isPublishedBlueprint,
  toBlueprintSummary,
  type BlueprintRow,
  type BlueprintSummary,
} from '../exam/blueprintSummary.js';

interface ExamAnswer {
  question_id: string;
  selected_option?: string;
  items?: Array<{ id: string; selected: boolean }>;
  short_answer?: string;
}

export const MAX_EXAM_ANSWERS = 200;
/** Question count for a blueprint whose sections do not give one. */
export const DEFAULT_EXAM_QUESTIONS = 20;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ExamQuestionRow {
  id: string;
  subject_id: string;
  type: string;
  difficulty: number;
  data: Record<string, unknown> | null;
}

type Loaded<T> = { kind: 'ok'; value: T } | { kind: 'not_found' } | { kind: 'error'; err: unknown };

interface LoadedBlueprint {
  summary: BlueprintSummary;
  /** Exact questions of an imported exam, in order; empty for a subject-pool exam. */
  questionIds: string[];
}

/** Fields that would give an answer away before the exam is submitted. */
const HIDDEN_QUESTION_FIELDS = ['answer', 'answer_key', 'explanation', 'rubric'];

async function loadBlueprint(supabase: SupabaseClient, blueprintId: string): Promise<Loaded<LoadedBlueprint>> {
  // exam_blueprints.id is a uuid: anything else can only be "not found", not a database error.
  if (!UUID_PATTERN.test(blueprintId)) return { kind: 'not_found' };
  const { data, error } = await supabase
    .from('exam_blueprints')
    .select(BLUEPRINT_COLUMNS)
    .eq('id', blueprintId)
    .maybeSingle();
  if (error) return { kind: 'error', err: error };
  if (!data) return { kind: 'not_found' };
  const row = data as BlueprintRow;
  if (!isPublishedBlueprint(row)) return { kind: 'not_found' };
  return { kind: 'ok', value: { summary: toBlueprintSummary(row), questionIds: blueprintQuestionIds(row) } };
}

/**
 * The questions of one exam. An imported exam lists its questions; otherwise the blueprint
 * subject's questions in a stable order, as many as its sections ask for. Serving and scoring
 * both use this, so a score only counts this set. Only published exam questions count: a
 * practice question (lessons) is never served or scored here, even if a blueprint lists it.
 */
async function loadExamQuestions(
  supabase: SupabaseClient,
  { summary: blueprint, questionIds }: LoadedBlueprint,
): Promise<Loaded<ExamQuestionRow[]>> {
  const columns = 'id, subject_id, type, difficulty, data';
  // 42703: a column the filters need does not exist yet (migration not run). Before the
  // exam-import migration every question was published; before the practice migration every
  // question was an exam question.
  const withFallback = async (run: (filtered: boolean) => PromiseLike<{ data: unknown; error: { code?: string } | null }>) => {
    let result = await run(true);
    if (result.error?.code === '42703') result = await run(false);
    return result;
  };

  if (questionIds.length > 0) {
    const ids = questionIds.slice(0, MAX_EXAM_ANSWERS);
    const { data, error } = await withFallback((filtered) => {
      let query = supabase.from('questions').select(columns).in('id', ids);
      if (filtered) query = query.eq('usage', 'exam').eq('status', 'published');
      return query;
    });
    if (error) return { kind: 'error', err: error };
    const byId = new Map(((data ?? []) as ExamQuestionRow[]).map((q) => [q.id, q]));
    return { kind: 'ok', value: ids.flatMap((id) => byId.get(id) ?? []) };
  }

  const count = Math.min(blueprint.question_count || DEFAULT_EXAM_QUESTIONS, MAX_EXAM_ANSWERS);
  const { data, error } = await withFallback((filtered) => {
    let query = supabase.from('questions').select(columns);
    if (blueprint.subject_id) query = query.eq('subject_id', blueprint.subject_id);
    if (filtered) query = query.eq('usage', 'exam').eq('status', 'published');
    return query.order('id').limit(count);
  });
  if (error) return { kind: 'error', err: error };
  return { kind: 'ok', value: (data ?? []) as ExamQuestionRow[] };
}

const normalizeShortAnswer = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

/** Server-side check of one answer against the stored key. */
export function isCorrectAnswer(question: Pick<ExamQuestionRow, 'type' | 'data'>, answer: ExamAnswer): boolean {
  const data = question.data ?? {};
  if (question.type === 'mc') {
    return typeof answer.selected_option === 'string' && answer.selected_option === data.answer;
  }
  if (question.type === 'truefalse') {
    if (!Array.isArray(data.items) || data.items.length === 0 || !Array.isArray(answer.items)) return false;
    return data.items.every((it: { id: string; correct: boolean }) => {
      const userIt = answer.items?.find((ui) => ui?.id === it.id);
      return userIt !== undefined && userIt.selected === it.correct;
    });
  }
  if (question.type === 'short') {
    const key = typeof data.answer === 'string' ? data.answer : data.answer_key;
    if (typeof answer.short_answer !== 'string' || typeof key !== 'string') return false;
    const given = normalizeShortAnswer(answer.short_answer);
    return given !== '' && given === normalizeShortAnswer(key);
  }
  return false;
}

/** Keep the first answer per question; drop entries without a string question_id. */
export function dedupeAnswers(answers: unknown[]): ExamAnswer[] {
  const seen = new Map<string, ExamAnswer>();
  for (const raw of answers) {
    const answer = raw as ExamAnswer | null;
    if (!answer || typeof answer.question_id !== 'string') continue;
    if (!seen.has(answer.question_id)) seen.set(answer.question_id, answer);
  }
  return [...seen.values()];
}

export const examRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/exam/blueprints', async (request, reply) => {
    if (!app.supabase) return reply.code(503).send({ error: 'Dịch vụ đề thi chưa sẵn sàng.' });
    const { data, error } = await app.supabase
      .from('exam_blueprints')
      .select(BLUEPRINT_COLUMNS)
      .order('name');
    if (error) {
      request.log.error({ err: error }, 'Failed to list exam blueprints');
      return reply.code(500).send({ error: 'Không tải được danh sách đề thi.' });
    }
    return reply.send({ blueprints: ((data ?? []) as BlueprintRow[]).filter(isPublishedBlueprint).map(toBlueprintSummary) });
  });

  // Fetch blueprint questions without exposing answers
  app.get('/api/exam/:blueprintId/questions', async (request, reply) => {
    const { blueprintId } = request.params as { blueprintId: string };
    if (!app.supabase) return reply.code(503).send({ error: 'Dịch vụ đề thi chưa sẵn sàng.' });

    const bp = await loadBlueprint(app.supabase, blueprintId);
    if (bp.kind === 'error') {
      request.log.error({ err: bp.err, blueprintId }, 'Failed to load exam blueprint');
      return reply.code(500).send({ error: 'Không tải được đề thi.' });
    }
    if (bp.kind === 'not_found') return reply.code(404).send({ error: 'Không tìm thấy đề thi.' });

    const questions = await loadExamQuestions(app.supabase, bp.value);
    if (questions.kind !== 'ok') {
      request.log.error({ err: questions.kind === 'error' ? questions.err : null, blueprintId }, 'Failed to load exam questions');
      return reply.code(500).send({ error: 'Không tải được câu hỏi của đề thi.' });
    }

    // Strip answer keys and correct fields strictly before sending to client
    const sanitized = questions.value.map((q) => {
      const d = { ...(q.data ?? {}) };
      for (const field of HIDDEN_QUESTION_FIELDS) delete d[field];
      if (Array.isArray(d.items)) {
        d.items = d.items.map((item: { id: string; text: unknown }) => ({
          id: item.id,
          text: item.text,
        }));
      }
      return {
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        data: d,
      };
    });

    return reply.send({ blueprint: bp.value.summary, questions: sanitized });
  });

  // Score exam server-side
  app.post('/api/score/exam', async (request, reply) => {
    const { blueprint_id, answers } = (request.body ?? {}) as {
      blueprint_id?: unknown;
      answers?: unknown;
    };

    if (typeof blueprint_id !== 'string' || !blueprint_id.trim() || blueprint_id.length > 64) {
      return reply.status(400).send({ error: 'blueprint_id required' });
    }
    if (!Array.isArray(answers)) {
      return reply.status(400).send({ error: 'Answers array required' });
    }
    if (answers.length > MAX_EXAM_ANSWERS) {
      return reply.status(400).send({ error: 'Too many answers' });
    }

    const blueprintId = blueprint_id.trim();
    const user = (request as any).user as { id?: string; sub?: string } | undefined;
    const userId = user?.id ?? user?.sub;
    if (!app.supabase) return reply.status(503).send({ error: 'Dịch vụ đề thi chưa sẵn sàng.' });

    const bp = await loadBlueprint(app.supabase, blueprintId);
    if (bp.kind === 'error') {
      request.log.error({ err: bp.err, blueprintId }, 'Failed to load exam blueprint for scoring');
      return reply.status(500).send({ error: 'Không chấm được bài thi.' });
    }
    if (bp.kind === 'not_found') return reply.status(404).send({ error: 'Không tìm thấy đề thi.' });

    const loaded = await loadExamQuestions(app.supabase, bp.value);
    if (loaded.kind !== 'ok') {
      request.log.error({ err: loaded.kind === 'error' ? loaded.err : null, blueprintId }, 'Failed to load exam questions for scoring');
      return reply.status(500).send({ error: 'Không chấm được bài thi.' });
    }

    // Score against the exam's own questions: unanswered ones count as wrong, and answers to
    // questions outside this exam are ignored.
    const examQuestions = loaded.value;
    const answersById = new Map(dedupeAnswers(answers).map((a) => [a.question_id, a]));
    let correctCount = 0;
    for (const question of examQuestions) {
      const answer = answersById.get(question.id);
      if (answer && isCorrectAnswer(question, answer)) correctCount++;
    }

    const total = examQuestions.length;
    const score = total > 0 ? Number(((correctCount / total) * 10).toFixed(2)) : 0;
    const possibleXp = correctCount * 15;
    let xp_earned = 0;
    let already_awarded = false;

    // XP for an exam of a single subject, once per user per blueprint (xp_log_exam_once_idx).
    const subjectIds = new Set(examQuestions.map((q) => q.subject_id).filter(Boolean));
    if (userId && possibleXp > 0 && subjectIds.size === 1) {
      try {
        const { error } = await app.supabase.from('xp_log').insert({
          user_id: userId,
          subject_id: [...subjectIds][0],
          delta: possibleXp,
          reason: `exam_complete:${blueprintId.toLowerCase()}`,
        });
        if (error?.code === '23505') already_awarded = true;
        else if (error) app.log.warn({ err: error }, 'Exam XP logging failed');
        else xp_earned = possibleXp;
      } catch (err) {
        app.log.warn({ err }, 'Exam XP logging failed');
      }
    }

    return reply.send({
      score,
      correct_count: correctCount,
      total_questions: total,
      xp_earned,
      already_awarded,
    });
  });
};
