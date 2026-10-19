import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Which practice question a caller may use, shared by the checking routes (practice.ts) and the
// code judging routes (practiceCode.ts).

export interface PracticeUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

export interface PracticeRow {
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

export const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const COLUMNS = 'id, usage, status, subject_id, lesson_id, created_by, type, difficulty, data';

export const msg = (error: string, error_en: string) => ({ error, error_en });
export const unavailable = msg('Câu hỏi này không còn dùng để luyện tập.', 'This question is not available for practice.');

export function getUser(request: FastifyRequest): PracticeUser | undefined {
  return (request as FastifyRequest & { user?: PracticeUser }).user;
}
export const isAdmin = (user: PracticeUser | undefined) => user?.app_metadata?.app_role === 'admin';
/** Authors and admins may try unpublished questions while previewing. */
export const mayPreview = (user: PracticeUser | undefined, createdBy: string | null) => isAdmin(user) || (!!user?.id && user.id === createdBy);

/**
 * A practice question the caller may use: published and in a published lesson, or the author's
 * (or an admin's) own while previewing. Otherwise the reply is sent here and null comes back.
 */
export async function servableQuestion(
  app: FastifyInstance,
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
