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
import { COLUMNS, getUser, ID, mayPreview, msg, servableQuestion as loadServable, type PracticeRow } from '../practice/servable.js';

// Practice in a lesson's Tự luyện part. Learners (signed in or not) load the questions of a
// published lesson without answers and check one answer at a time; the server decides and says
// only right or wrong (per statement for true/false), plus the explanation. Nothing is stored
// and no XP is given. Exam questions are never served or checked here. A writing answer (English,
// written or spoken) is checked for its key terms; a signed-in learner may then ask the AI
// Professor to comment on it, paid from the Professor's token quota.

const CHECK_BODY_LIMIT = 8 * 1024;

const lessonNotFound = msg('Không tìm thấy bài học.', 'Lesson not found.');
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
    return reply.send(checkPracticeAnswer(row, parsed.data));
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
