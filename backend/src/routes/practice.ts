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
  type PracticeCheckResult,
  type PracticeResponse,
} from '../schemas/questions.js';
import { MAX_LESSON_QUESTIONS, quizQuestionIds } from '../authoring/quizReferences.js';

// Practice in a lesson's Tự luyện part. Learners (signed in or not) load the questions of a
// published lesson without answers and check one answer at a time; the server decides and says
// only right or wrong (per statement for true/false), plus the explanation. Nothing is stored
// and no XP is given. Exam questions are never served or checked here. A writing answer (English,
// written or spoken) is checked for its key terms; a signed-in learner may then ask the AI
// Professor to comment on it, paid from the Professor's token quota.

interface PracticeUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

interface PracticeRow {
  id: string;
  usage: string;
  status: string;
  subject_id: string;
  lesson_id: string | null;
  created_by: string | null;
  type: string;
  difficulty: number;
  data: unknown;
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = 'id, usage, status, subject_id, lesson_id, created_by, type, difficulty, data';
const CHECK_BODY_LIMIT = 8 * 1024;

const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Câu hỏi này không còn dùng để luyện tập.', 'This question is not available for practice.');
const lessonNotFound = msg('Không tìm thấy bài học.', 'Lesson not found.');
const serviceDown = msg('Dịch vụ luyện tập chưa sẵn sàng.', 'Practice is not available right now.');

function getUser(request: FastifyRequest): PracticeUser | undefined {
  return (request as FastifyRequest & { user?: PracticeUser }).user;
}
const isAdmin = (user: PracticeUser | undefined) => user?.app_metadata?.app_role === 'admin';
/** Authors and admins may try unpublished questions while previewing. */
const mayPreview = (user: PracticeUser | undefined, createdBy: string | null) => isAdmin(user) || (!!user?.id && user.id === createdBy);

const normalize = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The key terms an English answer uses, as whole words in any case; the last word may take an
 * s/es/ed/ing ending ("loops", "repeated").
 */
export function keyTermsUsed(answer: string, terms: string[]): { used: string[]; missing: string[] } {
  const text = normalize(answer);
  const used: string[] = [];
  const missing: string[] = [];
  for (const term of terms) {
    const words = normalize(term).split(' ').map(escapeRegExp).join('\\s+');
    const found = words !== '' && new RegExp(`(^|[^\\p{L}\\p{N}])${words}(s|es|ed|ing)?($|[^\\p{L}\\p{N}])`, 'u').test(text);
    (found ? used : missing).push(term);
  }
  return { used, missing };
}

const keyTermsOf = (data: Record<string, unknown>) =>
  Array.isArray(data.key_terms) ? data.key_terms.filter((t): t is string => typeof t === 'string' && t.trim() !== '') : [];

function explanationOf(data: Record<string, unknown>): { en: string; vi: string } | undefined {
  const e = data.explanation as { en?: unknown; vi?: unknown } | undefined;
  if (!e || typeof e.vi !== 'string' || !e.vi.trim()) return undefined;
  return { vi: e.vi, en: typeof e.en === 'string' ? e.en : '' };
}

/** The answer has the shape of the question type and is not empty; otherwise a reason. */
export function responseProblem(row: Pick<PracticeRow, 'type' | 'data'>, response: PracticeResponse): { error: string; error_en: string } | null {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const others = (keys: Array<keyof PracticeResponse>) => keys.some((key) => response[key] !== undefined);
  if (row.type === 'mc') {
    if (others(['items', 'short_answer', 'writing_answer']) || !response.selected_option) return msg('Hãy chọn một phương án.', 'Choose an option.');
    return null;
  }
  if (row.type === 'truefalse') {
    const ids = new Set((Array.isArray(data.items) ? data.items : []).map((item: { id?: unknown }) => String(item?.id)));
    const given = response.items ?? [];
    if (others(['selected_option', 'short_answer', 'writing_answer']) || given.length === 0) return msg('Hãy chọn Đúng hoặc Sai cho ít nhất một ý.', 'Mark at least one statement true or false.');
    if (given.some((item) => !ids.has(item.id)) || new Set(given.map((item) => item.id)).size !== given.length) {
      return msg('Câu trả lời không khớp với các ý của câu hỏi.', 'The answer does not match the statements.');
    }
    return null;
  }
  if (row.type === 'writing') {
    if (others(['selected_option', 'items', 'short_answer']) || !normalize(response.writing_answer ?? '')) return msg('Hãy viết câu trả lời bằng tiếng Anh.', 'Write your answer in English.');
    return null;
  }
  if (others(['selected_option', 'items', 'writing_answer']) || !normalize(response.short_answer ?? '')) return msg('Hãy nhập câu trả lời.', 'Type an answer.');
  return null;
}

/** Server-side verdict. It never contains the expected option, truth values or answer key. */
export function checkPracticeAnswer(row: Pick<PracticeRow, 'type' | 'data'>, response: PracticeResponse): PracticeCheckResult {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const explanation = explanationOf(data);
  const withExplanation = (result: PracticeCheckResult): PracticeCheckResult => (explanation ? { ...result, explanation } : result);

  if (row.type === 'mc') {
    return withExplanation({ correct: typeof data.answer === 'string' && response.selected_option === data.answer });
  }
  if (row.type === 'truefalse') {
    const stored = (Array.isArray(data.items) ? data.items : []) as Array<{ id: string; correct: boolean }>;
    // Every statement gets a result; one left unanswered is simply not correct.
    const items = stored.map((item) => {
      const given = response.items?.find((g) => g.id === item.id);
      return { id: item.id, correct: given !== undefined && given.selected === item.correct };
    });
    return withExplanation({ correct: items.length > 0 && items.every((item) => item.correct), items });
  }
  if (row.type === 'writing') {
    const { used, missing } = keyTermsUsed(response.writing_answer ?? '', keyTermsOf(data));
    const sample = typeof data.sample_answer === 'string' ? data.sample_answer : '';
    return withExplanation({ correct: missing.length === 0, writing: { used, missing, sample_answer: sample } });
  }
  const key = typeof data.answer_key === 'string' ? data.answer_key : typeof data.answer === 'string' ? data.answer : '';
  const given = normalize(response.short_answer ?? '');
  return withExplanation({ correct: given !== '' && given === normalize(key) });
}

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

export const practiceRoutes: FastifyPluginAsync = async (app) => {
  /**
   * A practice question the caller may use: published and in a published lesson, or the author's
   * (or an admin's) own while previewing. Otherwise the reply is sent here and null comes back.
   */
  async function servableQuestion(
    request: FastifyRequest,
    reply: FastifyReply,
    questionId: string,
    failure: { error: string; error_en: string },
  ): Promise<PracticeRow | null> {
    const supabase = app.supabase!;
    const user = getUser(request);
    const { data, error } = await supabase.from('questions').select(COLUMNS).eq('id', questionId).maybeSingle();
    if (error) {
      request.log.error({ err: error, questionId }, 'Failed to load practice question');
      reply.code(500).send(failure);
      return null;
    }
    const row = data as PracticeRow | null;
    // Exam questions, and anything not published, answer "unavailable" alike: nothing to probe.
    if (!row || row.usage !== 'practice') {
      reply.code(404).send(unavailable);
      return null;
    }
    if (!mayPreview(user, row.created_by)) {
      if (row.status !== 'published') {
        reply.code(404).send(unavailable);
        return null;
      }
      const { data: lessons, error: lessonError } = await supabase
        .from('lessons')
        .select('id')
        .eq('status', 'published')
        // jsonb containment: postgrest-js sends a JS array as a Postgres array literal, so pass JSON.
        .contains('blocks', JSON.stringify([{ type: 'quiz', question_id: row.id }]))
        .limit(1);
      if (lessonError) {
        request.log.error({ err: lessonError, questionId: row.id }, 'Failed to find the lesson of a practice question');
        reply.code(500).send(failure);
        return null;
      }
      if ((lessons ?? []).length === 0) {
        reply.code(404).send(unavailable);
        return null;
      }
    }
    return row;
  }

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
