import type { FastifyPluginAsync } from 'fastify';
import { BLUEPRINT_COLUMNS, toBlueprintSummary, type BlueprintRow } from '../exam/blueprintSummary.js';

interface ExamAnswer {
  question_id: string;
  selected_option?: string;
  items?: Array<{ id: string; selected: boolean }>;
  short_answer?: string;
}

export const MAX_EXAM_ANSWERS = 200;

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
    return reply.send({ blueprints: ((data ?? []) as BlueprintRow[]).map(toBlueprintSummary) });
  });

  // Fetch blueprint questions without exposing answers
  app.get('/api/exam/:blueprintId/questions', async (request, reply) => {
    const { blueprintId } = request.params as { blueprintId: string };
    if (!app.supabase) return reply.code(503).send({ error: 'Dịch vụ đề thi chưa sẵn sàng.' });

    const { data: bp, error: bpError } = await app.supabase
      .from('exam_blueprints')
      .select(BLUEPRINT_COLUMNS)
      .eq('id', blueprintId)
      .maybeSingle();
    if (bpError) {
      request.log.error({ err: bpError, blueprintId }, 'Failed to load exam blueprint');
      return reply.code(500).send({ error: 'Không tải được đề thi.' });
    }
    if (!bp) return reply.code(404).send({ error: 'Không tìm thấy đề thi.' });
    const blueprint = toBlueprintSummary(bp as BlueprintRow);

    const { data: questions } = await app.supabase
      .from('questions')
      .select('id, subject_id, type, difficulty, data')
      .limit(20);
    const rawQuestions: any[] = questions ?? [];

    // Strip answer keys and correct fields strictly before sending to client
    const sanitized = rawQuestions.map((q) => {
      const d = { ...(q.data as Record<string, unknown>) };
      delete d.answer;
      delete d.answer_key;
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

    return reply.send({ blueprint, questions: sanitized });
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
    const uniqueAnswers = dedupeAnswers(answers);
    const user = (request as any).user as { id?: string; sub?: string } | undefined;
    const userId = user?.id ?? user?.sub;

    const questionIds = uniqueAnswers.map((a) => a.question_id);
    let dbMap = new Map<string, any>();

    if (app.supabase && questionIds.length > 0) {
      const { data: dbQuestions } = await app.supabase
        .from('questions')
        .select('id, type, data, subject_id')
        .in('id', questionIds);

      if (dbQuestions && dbQuestions.length > 0) {
        dbMap = new Map(dbQuestions.map((q) => [q.id, q]));
      }
    }

    let correctCount = 0;
    const total = uniqueAnswers.length;

    for (const ans of uniqueAnswers) {
      const dbQ = dbMap.get(ans.question_id);
      if (dbQ) {
        const data = dbQ.data as Record<string, unknown>;
        if (dbQ.type === 'mc' && ans.selected_option === data.answer) {
          correctCount++;
        } else if (dbQ.type === 'truefalse' && Array.isArray(data.items) && Array.isArray(ans.items)) {
          const allCorrect = data.items.every((it: { id: string; correct: boolean }) => {
            const userIt = ans.items?.find((ui) => ui.id === it.id);
            return userIt && userIt.selected === it.correct;
          });
          if (allCorrect) correctCount++;
        }
      }
    }

    const score = total > 0 ? Number(((correctCount / total) * 10).toFixed(2)) : 0;
    const possibleXp = correctCount * 15;
    let xp_earned = 0;
    let already_awarded = false;

    // XP only for real DB questions of a single subject, once per user per blueprint
    // (enforced by xp_log_exam_once_idx).
    const subjectIds = new Set(
      questionIds.map((id) => dbMap.get(id)?.subject_id).filter(Boolean),
    );

    // UUID validation: only award XP for valid UUID blueprint ids
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidPattern.test(blueprintId);

    if (
      userId && possibleXp > 0 && app.supabase &&
      dbMap.size === questionIds.length && subjectIds.size === 1 &&
      isValidUuid
    ) {
      try {
        // Check if blueprint exists in database
        const { data: blueprint, error: blueprintError } = await app.supabase
          .from('exam_blueprints')
          .select('id')
          .eq('id', blueprintId)
          .maybeSingle();

        if (blueprintError) {
          app.log.warn({ err: blueprintError }, 'Blueprint lookup failed');
        } else if (blueprint) {
          // Blueprint exists, award XP
          const { error } = await app.supabase.from('xp_log').insert({
            user_id: userId,
            subject_id: [...subjectIds][0],
            delta: possibleXp,
            reason: `exam_complete:${blueprintId.toLowerCase()}`,
          });
          if (error?.code === '23505') already_awarded = true;
          else if (error) app.log.warn({ err: error }, 'Exam XP logging failed');
          else xp_earned = possibleXp;
        }
        // If blueprint is null, award no XP (still return success response)
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
