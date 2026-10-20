import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { holdTutorTokens } from '../tutor/quotaHold.js';
import { resolveTutorSettings } from '../tutor/settings.js';
import { tokensUsed } from '../tutor/tokens.js';
import { WRITING_HOLD_TOKENS, writingFeedbackMessage, writingFeedbackSystemPrompt } from '../tutor/writingFeedback.js';
import {
  MAX_WRITING_ANSWER,
  PracticeResponseSchema,
  toPublicPracticeQuestion,
} from '../schemas/questions.js';
import { checkPracticeAnswer, keyTermsOf, responseProblem } from '../schemas/practiceGrading.js';
import { MAX_LESSON_QUESTIONS, quizQuestionIds } from '../authoring/quizReferences.js';
import { clampAnsweredAt, recordPractice } from '../practice/record.js';
import { COLUMNS, getUser, ID, isAdmin, isHsgProblem, loadPracticeRow, mayPreview, msg, servableQuestion as loadServable, type PracticeRow, type PracticeUser } from '../practice/servable.js';

// Practice in a lesson's Tự luyện part. Learners (signed in or not) load the questions of a
// published lesson without answers and check one answer at a time; the server decides and says
// only right or wrong (per statement for true/false), plus the explanation. A signed-in learner's
// first answer to each question is kept and earns XP (practice/record.ts). Exam questions are
// never served or checked here. A writing answer (English, written or spoken) is checked for its
// key terms; a signed-in learner may then ask the AI Professor to comment on it, paid from the
// Professor's token quota.

const CHECK_BODY_LIMIT = 8 * 1024;

// Up to 100 offline answers in one sync; a writing answer may take 1000 characters.
const SYNC_BODY_LIMIT = 256 * 1024;
const OFFLINE_TYPES = ['mc', 'truefalse', 'short', 'writing'];

const SyncBody = z.object({ attempts: z.array(z.unknown()).min(1).max(100) }).strict();
// Each answer is checked on its own: one malformed item is rejected without losing the others.
const SyncItem = z
  .object({
    question_id: z.string().regex(ID),
    lesson_id: z.string().regex(ID),
    response: PracticeResponseSchema,
    answered_at: z.string().max(40),
  })
  .strict();

const lessonNotFound = msg('Không tìm thấy bài học.', 'Lesson not found.');
const signIn = msg('Đăng nhập để lưu kết quả luyện tập.', 'Sign in to keep your practice results.');
const serviceDown = msg('Dịch vụ luyện tập chưa sẵn sàng.', 'Practice is not available right now.');

const FeedbackBody = z
  .object({
    question_id: z.string().regex(ID),
    answer: z.string().trim().min(1).max(MAX_WRITING_ANSWER),
    language: z.enum(['vi', 'en']),
  })
  .strict();

const FEEDBACK_FAILED = msg(
  'Giáo sư AI chưa nhận xét được lúc này. Lần này không bị trừ token, em thử lại sau nhé.',
  'The Professor could not comment right now. No tokens were used, try again later.',
);

export { checkPracticeAnswer, explanationOf, keyTermsUsed, responseProblem } from '../schemas/practiceGrading.js';

/** A signed-in learner's answer earns XP on a published lesson question; never the author's own, an admin's (who may open any question), or a programming one. */
export const countsForXp = (row: PracticeRow, user: PracticeUser & { id: string }) =>
  !isAdmin(user) && row.status === 'published' && row.created_by !== user.id && row.type !== 'code' && !isHsgProblem(row);

export const practiceRoutes: FastifyPluginAsync = async (app) => {
  const servableQuestion = (request: FastifyRequest, reply: FastifyReply, questionId: string, failure: { error: string; error_en: string }) =>
    loadServable(app, request, reply, questionId, failure);

  app.get('/api/practice/lessons/:lessonId/questions', async (request, reply) => {
    const { lessonId } = request.params as { lessonId: string };
    if (!ID.test(lessonId)) return reply.code(404).send(lessonNotFound);
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(serviceDown);
    const user = getUser(request);

    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, subject_id, status, created_by, blocks')
      .eq('id', lessonId)
      .maybeSingle();
    if (lessonError) {
      request.log.error({ err: lessonError, lessonId }, 'Failed to load practice lesson');
      return reply.code(500).send(msg('Không tải được câu tự luyện.', 'Could not load the practice questions.'));
    }
    const lesson = lessonData as { id: string; subject_id: string; status: string; created_by: string | null; blocks: unknown } | null;
    const preview = !!lesson && lesson.status !== 'published' && mayPreview(user, lesson.created_by);
    if (!lesson || (lesson.status !== 'published' && !preview)) return reply.code(404).send(lessonNotFound);

    const ids = quizQuestionIds(lesson.blocks).filter((id) => ID.test(id)).slice(0, MAX_LESSON_QUESTIONS);
    if (ids.length === 0) return reply.send({ questions: [] });
    let query = supabase.from('questions').select(COLUMNS).in('id', ids).eq('usage', 'practice').eq('subject_id', lesson.subject_id);
    // Learners see published questions only; the author previewing sees the lesson as it will be.
    if (!preview) query = query.eq('status', 'published');
    const { data, error } = await query;
    if (error) {
      request.log.error({ err: error, lessonId }, 'Failed to load practice questions');
      return reply.code(500).send(msg('Không tải được câu tự luyện.', 'Could not load the practice questions.'));
    }
    const byId = new Map(((data ?? []) as PracticeRow[]).map((row) => [row.id, row]));
    return reply.send({ questions: ids.flatMap((id) => (byId.has(id) ? [toPublicPracticeQuestion(byId.get(id)!)] : [])) });
  });

  // The offline package of a published lesson: its practice questions, and what grades them, for a
  // signed-in learner who chose to keep the lesson on the device. Programming questions stay online.
  // The first download is recorded; an offline answer is never dated before it.
  app.get('/api/practice/lessons/:lessonId/offline', async (request, reply) => {
    const { lessonId } = request.params as { lessonId: string };
    const userId = getUser(request)?.id;
    if (!userId) return reply.code(401).send(signIn);
    if (!ID.test(lessonId)) return reply.code(404).send(lessonNotFound);
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(serviceDown);
    const failed = msg('Không tải được bài để học offline.', 'Could not save the lesson for offline.');

    const { data: lessonData, error: lessonError } = await supabase.from('lessons').select('id, subject_id, status, blocks').eq('id', lessonId).maybeSingle();
    if (lessonError) {
      request.log.error({ err: lessonError, lessonId }, 'Failed to load the offline lesson');
      return reply.code(500).send(failed);
    }
    const lesson = lessonData as { id: string; subject_id: string; status: string; blocks: unknown } | null;
    if (!lesson || lesson.status !== 'published') return reply.code(404).send(lessonNotFound);

    const ids = quizQuestionIds(lesson.blocks).filter((id) => ID.test(id)).slice(0, MAX_LESSON_QUESTIONS);
    let rows: PracticeRow[] = [];
    if (ids.length > 0) {
      const { data, error } = await supabase
        .from('questions')
        .select(COLUMNS)
        .in('id', ids)
        .eq('usage', 'practice')
        .eq('subject_id', lesson.subject_id)
        .eq('status', 'published')
        .in('type', OFFLINE_TYPES);
      if (error) {
        request.log.error({ err: error, lessonId }, 'Failed to load the offline questions');
        return reply.code(500).send(failed);
      }
      const byId = new Map(((data ?? []) as PracticeRow[]).map((row) => [row.id, row]));
      rows = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    }

    const { error: markError } = await supabase
      .from('offline_downloads')
      .upsert({ user_id: userId, lesson_id: lesson.id }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true });
    const { data: mark, error: readError } = markError
      ? { data: null, error: markError }
      : await supabase.from('offline_downloads').select('downloaded_at').eq('user_id', userId).eq('lesson_id', lesson.id).maybeSingle();
    if (readError || !mark) {
      request.log.error({ err: readError, lessonId }, 'Failed to record the offline download');
      return reply.code(500).send(failed);
    }
    reply.header('Cache-Control', 'no-store');
    return reply.send({
      lesson_id: lesson.id,
      subject_id: lesson.subject_id,
      downloaded_at: (mark as { downloaded_at: string }).downloaded_at,
      questions: rows.map(toPublicPracticeQuestion),
      keys: Object.fromEntries(rows.map((row) => [row.id, { type: row.type, difficulty: row.difficulty, data: row.data }])),
    });
  });

  // Answers made offline, sent when the connection returns. The server grades each again and is the
  // only judge; an answer counts at the time it was made (clamped), as if it had been sent then.
  app.post('/api/practice/sync', { bodyLimit: SYNC_BODY_LIMIT }, async (request, reply) => {
    const user = getUser(request);
    const userId = user?.id;
    if (!userId) return reply.code(401).send(signIn);
    const parsed = SyncBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(msg('Danh sách câu trả lời không đúng định dạng.', 'The answers are not in a valid format.'));
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(serviceDown);

    const { data: marks, error: marksError } = await supabase.from('offline_downloads').select('lesson_id, downloaded_at').eq('user_id', userId);
    if (marksError) {
      request.log.error({ err: marksError }, 'Failed to read offline downloads');
      return reply.code(500).send(serviceDown);
    }
    const downloadedAt = new Map(((marks ?? []) as Array<{ lesson_id: string; downloaded_at: string }>).map((m) => [m.lesson_id, m.downloaded_at]));
    const now = new Date();
    // The download time counts only for a published lesson that really holds the question; another
    // lesson's earlier download must not date the answer.
    const downloadOf = async (lessonId: string, questionId: string): Promise<string | null> => {
      const at = downloadedAt.get(lessonId);
      if (!at) return null;
      const { data, error } = await supabase
        .from('lessons')
        .select('id')
        .eq('id', lessonId)
        .eq('status', 'published')
        .contains('blocks', JSON.stringify([{ type: 'quiz', question_id: questionId }]))
        .maybeSingle();
      return !error && data ? at : null;
    };
    const results: Array<Record<string, unknown>> = [];
    const attempts: Array<z.infer<typeof SyncItem>> = [];
    for (const raw of parsed.data.attempts) {
      const item = SyncItem.safeParse(raw);
      if (item.success) attempts.push(item.data);
      else results.push({ question_id: String((raw as { question_id?: unknown } | null)?.question_id ?? ''), status: 'rejected' });
    }
    attempts.sort((a, b) => Date.parse(a.answered_at) - Date.parse(b.answered_at) || 0);
    for (const attempt of attempts) {
      const { question_id } = attempt;
      const row = await loadPracticeRow(supabase, user, question_id, request.log);
      if (row === 'error') {
        results.push({ question_id, status: 'error' });
        continue;
      }
      if (row === 'gone' || row.type === 'code' || isHsgProblem(row)) {
        results.push({ question_id, status: 'gone' });
        continue;
      }
      if (responseProblem(row, attempt.response)) {
        results.push({ question_id, status: 'rejected' });
        continue;
      }
      const result = checkPracticeAnswer(row, attempt.response);
      const at = clampAnsweredAt(attempt.answered_at, await downloadOf(attempt.lesson_id, question_id), now);
      const record = countsForXp(row, { ...user, id: userId })
        ? await recordPractice(supabase, { userId, row, correct: result.correct, at }, request.log)
        : { counted: false, xp_earned: 0, new_streak: 0, lesson_completed: false };
      results.push({ question_id, status: 'ok', ...result, ...record });
    }
    return reply.send({ results });
  });

  app.post('/api/practice/check', { bodyLimit: CHECK_BODY_LIMIT }, async (request, reply) => {
    const body = (request.body ?? {}) as { question_id?: unknown; response?: unknown };
    if (typeof body.question_id !== 'string' || !ID.test(body.question_id)) {
      return reply.code(400).send(msg('Thiếu mã câu hỏi.', 'Missing question ID.'));
    }
    const parsed = PracticeResponseSchema.safeParse(body.response);
    if (!parsed.success) return reply.code(400).send(msg('Câu trả lời không đúng định dạng.', 'The answer is not in a valid format.'));
    if (!app.supabase) return reply.code(503).send(serviceDown);
    const row = await servableQuestion(request, reply, body.question_id, msg('Không chấm được câu trả lời.', 'Could not check the answer.'));
    if (!row) return reply;

    const problem = responseProblem(row, parsed.data);
    if (problem) return reply.code(400).send(problem);
    const result = checkPracticeAnswer(row, parsed.data);
    const userId = getUser(request)?.id;
    if (!userId || !countsForXp(row, { ...getUser(request), id: userId })) return reply.send(result);
    const record = await recordPractice(app.supabase, { userId, row, correct: result.correct, at: new Date() }, request.log);
    return reply.send({ ...result, xp_earned: record.xp_earned, new_streak: record.new_streak, lesson_completed: record.lesson_completed });
  });

  // The AI Professor's comment on a writing answer. Tokens are held before asking, counted for
  // what the model used once it answered, and given back on any failure. Admins are not counted.
  // ponytail: not added to the Professor's daily cap (that sums tutor_messages); the plan quota applies.
  app.post('/api/practice/writing-feedback', { bodyLimit: CHECK_BODY_LIMIT }, async (request, reply) => {
    const user = getUser(request);
    if (!user?.id) return reply.code(401).send(msg('Đăng nhập để Giáo sư AI nhận xét bài viết.', "Sign in to get the Professor's comments."));
    const parsed = FeedbackBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(msg('Hãy viết câu trả lời (tối đa 1000 ký tự).', 'Write an answer (up to 1000 characters).'));
    const input = parsed.data;
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(serviceDown);
    const row = await servableQuestion(request, reply, input.question_id, FEEDBACK_FAILED);
    if (!row) return reply;
    if (row.type !== 'writing') return reply.code(400).send(msg('Câu này không phải câu viết tiếng Anh.', 'This is not an English writing question.'));

    const held = await holdTutorTokens(supabase, { ...user, id: user.id }, WRITING_HOLD_TOKENS, request.log);
    if (!held.ok) return reply.code(held.status).send(held.body);
    const { hold } = held;

    const data = (row.data ?? {}) as Record<string, unknown>;
    const stem = data.stem as { en?: string; vi?: string } | undefined;
    const system = writingFeedbackSystemPrompt(input.language);
    const content = writingFeedbackMessage({
      stem: (input.language === 'en' ? stem?.en || stem?.vi : stem?.vi || stem?.en) ?? '',
      sample: typeof data.sample_answer === 'string' ? data.sample_answer : '',
      keyTerms: keyTermsOf(data),
      answer: input.answer,
    });
    const settings = app.tutorSettings ? await app.tutorSettings.get() : resolveTutorSettings(null, process.env);
    let feedback = '';
    let reported: number | undefined;
    try {
      for await (const chunk of app.aiProvider.chat([{ role: 'user', content }], system, { provider: settings.provider, model: settings.model, effort: settings.reasoningEffort }, (u) => {
        reported = u.total;
      })) {
        feedback += chunk;
      }
    } catch (err) {
      request.log.error({ err }, 'Writing feedback provider failed');
      feedback = '';
    }
    feedback = feedback.trim();
    if (!feedback) {
      await hold.settle('release');
      return reply.code(502).send(FEEDBACK_FAILED);
    }
    const used = tokensUsed(reported, system + content, feedback);
    await hold.settle('commit', used);
    return reply.send({ feedback: feedback.slice(0, 4000), remaining: hold.remainingAfter(used) });
  });
};
