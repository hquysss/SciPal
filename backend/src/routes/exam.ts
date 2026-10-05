import { createHash, randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BillingRepositoryError, createBillingRepository } from '../billing/repository.js';
import { periodOf, periodWords, type QuotaPeriod } from '../billing/quotaPeriod.js';
import {
  BLUEPRINT_COLUMNS,
  BLUEPRINT_COLUMNS_BEFORE_ARCHIVE,
  blueprintFormat,
  blueprintQuestionIds,
  isBlueprintSubjectArchived,
  isPublishedBlueprint,
  toBlueprintSummary,
  type BlueprintRow,
  type BlueprintSummary,
} from '../exam/blueprintSummary.js';
import { isEstimatedFormat, scoreExam, type ExamAnswer, type ScoredSection } from '../exam/scoring.js';
import { featureAllowed, featureOff } from '../site/features.js';

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

type BlueprintRead = PromiseLike<{ data: unknown; error: { code?: string } | null }>;

/** 42703: subjects.archived_at does not exist yet (migration not run), so no subject is archived. */
async function readBlueprints(run: (columns: string) => BlueprintRead) {
  let result = await run(BLUEPRINT_COLUMNS);
  if (result.error?.code === '42703') result = await run(BLUEPRINT_COLUMNS_BEFORE_ARCHIVE);
  return result;
}

/** Learners see a published exam of a subject that is not archived. */
const isLearnerBlueprint = (row: BlueprintRow) => isPublishedBlueprint(row) && !isBlueprintSubjectArchived(row);

async function loadBlueprint(supabase: SupabaseClient, blueprintId: string): Promise<Loaded<LoadedBlueprint>> {
  // exam_blueprints.id is a uuid: anything else can only be "not found", not a database error.
  if (!UUID_PATTERN.test(blueprintId)) return { kind: 'not_found' };
  const { data, error } = await readBlueprints((columns) => supabase
    .from('exam_blueprints')
    .select(columns)
    .eq('id', blueprintId)
    .maybeSingle());
  if (error) return { kind: 'error', err: error };
  if (!data) return { kind: 'not_found' };
  const row = data as BlueprintRow;
  if (!isLearnerBlueprint(row)) return { kind: 'not_found' };
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

type AttemptRow = {
  id: string;
  user_id: string;
  blueprint_id: string;
  metered: boolean;
  status: 'started' | 'submitted';
  score: number | string | null;
  max_score?: number | string | null;
  section_scores?: ScoredSection[] | null;
  correct_count: number | null;
  total_questions: number | null;
  xp_earned: number | null;
};
type Caller = { id?: string; sub?: string; app_metadata?: { app_role?: string } };
const bi = (error: string, error_en: string) => ({ error, error_en });
const ATTEMPT_COLUMNS = 'id, user_id, blueprint_id, metered, status, score, max_score, section_scores, correct_count, total_questions, xp_earned';
const attemptNotFound = { code: 'ATTEMPT_NOT_FOUND', ...bi('Không tìm thấy lượt làm bài này.', 'This exam attempt was not found.') };

/**
 * The stored result of a submitted attempt, as the scoring route answers it. An attempt from before
 * exam formats has no max_score or section_scores: it is out of 10 with no sections. Whether the
 * result is an estimate is a property of the exam's format, so it is read from the blueprint, and
 * only for an attempt that has section scores (a generic or older attempt is never an estimate).
 */
async function storedResult(supabase: SupabaseClient, log: { warn: (obj: object, msg: string) => void }, a: AttemptRow) {
  const sections = Array.isArray(a.section_scores) ? a.section_scores : [];
  let estimated = false;
  if (sections.length > 0) {
    const { data, error } = await supabase.from('exam_blueprints').select('format').eq('id', a.blueprint_id).maybeSingle();
    if (error) log.warn({ err: error, blueprintId: a.blueprint_id }, 'Failed to read the exam format of a stored result');
    estimated = isEstimatedFormat(blueprintFormat((data ?? {}) as { format?: string | null }));
  }
  return {
    score: Number(a.score),
    max_score: a.max_score == null ? 10 : Number(a.max_score),
    correct_count: a.correct_count ?? 0,
    total_questions: a.total_questions ?? 0,
    xp_earned: a.xp_earned ?? 0,
    estimated,
    sections,
    already_awarded: true,
    already_submitted: true,
  };
}

export const examRoutes: FastifyPluginAsync = async (app) => {
  const caller = (request: FastifyRequest) => (request as FastifyRequest & { user?: Caller }).user;

  // A graded attempt is created before the exam starts (spec §5): for students it holds one
  // graded_exam_attempts request, counted when the result is stored. The same attempt_id resumes.
  app.post('/api/exam/:blueprintId/attempts', async (request, reply) => {
    const user = caller(request);
    const uid = user?.id ?? user?.sub;
    // /api/exam/ is public for reading exams; starting a graded attempt is not.
    if (!uid) return reply.code(401).send({ code: 'AUTH_REQUIRED', ...bi('Hãy đăng nhập để làm bài thi có chấm điểm.', 'Sign in to take a graded exam.') });
    if (!(await featureAllowed(app, 'exam', user as never))) return reply.code(403).send(featureOff('exam'));
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(bi('Dịch vụ đề thi chưa sẵn sàng.', 'The exam service is not available.'));
    const { blueprintId } = request.params as { blueprintId: string };
    const asked = (request.body as { attempt_id?: unknown } | undefined)?.attempt_id;
    const attemptId = typeof asked === 'string' && UUID_PATTERN.test(asked) ? asked.toLowerCase() : randomUUID();

    const { data: existing, error: readError } = await supabase.from('exam_attempts').select(ATTEMPT_COLUMNS).eq('id', attemptId).maybeSingle();
    if (readError) {
      request.log.error({ err: readError }, 'Failed to read an exam attempt');
      return reply.code(500).send(bi('Chưa bắt đầu được bài thi.', 'Could not start the exam.'));
    }
    const found = existing as AttemptRow | null;
    if (found) {
      if (found.user_id !== uid || found.blueprint_id !== blueprintId) return reply.code(404).send(attemptNotFound);
      return { attempt_id: found.id, status: found.status, remaining: null, period: null, ...(found.status === 'submitted' ? { result: await storedResult(supabase, app.log, found) } : {}) };
    }

    const bp = await loadBlueprint(supabase, blueprintId);
    if (bp.kind === 'error') {
      request.log.error({ err: bp.err, blueprintId }, 'Failed to load exam blueprint for an attempt');
      return reply.code(500).send(bi('Chưa bắt đầu được bài thi.', 'Could not start the exam.'));
    }
    if (bp.kind === 'not_found') return reply.code(404).send(bi('Không tìm thấy đề thi.', 'Exam not found.'));

    // Teachers and admins are not metered for exams (their plans have no exam quota).
    const role = user?.app_metadata?.app_role;
    const metered = role !== 'admin' && role !== 'teacher';
    const billing = createBillingRepository((name, args) => supabase.rpc(name, args));
    let remaining: number | null = null;
    let period: QuotaPeriod | null = null;
    if (metered) {
      try {
        const hash = createHash('sha256').update(`${uid}:${blueprintId}:${attemptId}`).digest('hex');
        const hold = await billing.reserveQuota(uid, 'graded_exam_attempts', attemptId, 1, hash);
        remaining = hold.remaining;
        period = periodOf(hold.kind);
      } catch (err) {
        if (err instanceof BillingRepositoryError && err.code === 'QUOTA_EXCEEDED') {
          const quota = await billing.getEffectiveQuotas(uid, new Date()).then((qs) => qs.find((q) => q.metric === 'graded_exam_attempts')).catch(() => undefined);
          const limit = quota?.limit ?? 0;
          const refusedPeriod = periodOf(quota?.kind);
          const words = periodWords(refusedPeriod);
          return reply.code(429).send({
            code: 'QUOTA_EXCEEDED',
            ...bi(`Em đã dùng hết ${limit} lượt thi chấm điểm ${words.vi}.`, `You have used your ${limit} graded exam attempts ${words.en}.`),
            remaining: 0,
            period: refusedPeriod,
            limit,
            resetsAt: quota?.resetsAt ?? null,
          });
        }
        request.log.error({ err }, 'Failed to hold an exam attempt');
        return reply.code(503).send({ code: 'BILLING_UNAVAILABLE', ...bi('Chưa kiểm tra được lượt thi. Em thử lại sau ít phút nhé.', 'Could not check your exam attempts. Try again in a few minutes.') });
      }
    }

    const { error: insertError } = await supabase.from('exam_attempts').insert({ id: attemptId, user_id: uid, blueprint_id: blueprintId, metered });
    if (insertError) {
      if (metered) await billing.settleQuota(attemptId, 'release').catch((err) => request.log.error({ err }, 'Failed to give back an exam attempt'));
      request.log.error({ err: insertError }, 'Failed to store an exam attempt');
      return reply.code(500).send(bi('Chưa bắt đầu được bài thi.', 'Could not start the exam.'));
    }
    return { attempt_id: attemptId, status: 'started', remaining, period };
  });

  app.get('/api/exam/blueprints', async (request, reply) => {
    if (!app.supabase) return reply.code(503).send({ error: 'Dịch vụ đề thi chưa sẵn sàng.' });
    const supabase = app.supabase;
    const { data, error } = await readBlueprints((columns) => supabase
      .from('exam_blueprints')
      .select(columns)
      .order('name'));
    if (error) {
      request.log.error({ err: error }, 'Failed to list exam blueprints');
      return reply.code(500).send({ error: 'Không tải được danh sách đề thi.' });
    }
    return reply.send({ blueprints: ((data ?? []) as BlueprintRow[]).filter(isLearnerBlueprint).map((r) => ({ ...toBlueprintSummary(r), layout: null })) });
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
    const { blueprint_id, attempt_id, answers } = (request.body ?? {}) as {
      blueprint_id?: unknown;
      attempt_id?: unknown;
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

    if (typeof attempt_id !== 'string' || !UUID_PATTERN.test(attempt_id)) {
      return reply.status(400).send({ code: 'ATTEMPT_REQUIRED', ...bi('Thiếu lượt làm bài. Tải lại trang đề thi.', 'The exam attempt is missing. Reload the exam page.') });
    }

    const blueprintId = blueprint_id.trim();
    const user = caller(request);
    const userId = user?.id ?? user?.sub;
    if (!app.supabase) return reply.status(503).send({ error: 'Dịch vụ đề thi chưa sẵn sàng.' });
    const supabase = app.supabase;
    const attemptId = attempt_id.toLowerCase();

    const loadAttempt = async () => {
      const { data, error } = await supabase.from('exam_attempts').select(ATTEMPT_COLUMNS).eq('id', attemptId).eq('user_id', userId ?? '').maybeSingle();
      return { attempt: data as AttemptRow | null, error };
    };
    const first = await loadAttempt();
    if (first.error) {
      request.log.error({ err: first.error }, 'Failed to read an exam attempt');
      return reply.status(500).send({ error: 'Không chấm được bài thi.' });
    }
    const attempt = first.attempt;
    if (!attempt || attempt.blueprint_id !== blueprintId) return reply.status(404).send(attemptNotFound);
    // Submitting the same attempt again answers the stored result: no new score, XP or charge.
    if (attempt.status === 'submitted') return reply.send(await storedResult(supabase, app.log, attempt));

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
    const scored = scoreExam({
      format: bp.value.summary.format,
      layout: bp.value.summary.layout,
      questions: examQuestions.map((q) => ({ id: q.id, type: q.type, data: q.data ?? {} })),
      answers: answersById,
      isCorrect: isCorrectAnswer,
    });
    const correctCount = scored.correct_count;
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

    const result = {
      score: scored.score,
      max_score: scored.max_score,
      correct_count: scored.correct_count,
      total_questions: scored.total_questions,
      xp_earned,
    };
    const { data: saved, error: saveError } = await supabase
      .from('exam_attempts')
      .update({ status: 'submitted', ...result, section_scores: scored.sections, submitted_at: new Date().toISOString() })
      .eq('id', attemptId)
      .eq('status', 'started')
      .select('id');
    if (saveError) {
      request.log.error({ err: saveError }, 'Failed to store an exam result');
      return reply.status(500).send({ error: 'Không lưu được kết quả bài thi. Em nộp lại nhé.' });
    }
    if (!saved || (saved as unknown[]).length === 0) {
      // Another submit of this attempt stored its result first: answer that one.
      const again = await loadAttempt();
      if (again.attempt?.status === 'submitted') return reply.send(await storedResult(supabase, app.log, again.attempt));
      return reply.status(500).send({ error: 'Không lưu được kết quả bài thi. Em nộp lại nhé.' });
    }
    if (attempt.metered) {
      const billing = createBillingRepository((name, args) => supabase.rpc(name, args));
      await billing.settleQuota(attemptId, 'commit').catch((err) => request.log.error({ err }, 'Failed to count an exam attempt'));
    }

    return reply.send({ ...result, estimated: scored.estimated, sections: scored.sections, already_awarded });
  });
};
