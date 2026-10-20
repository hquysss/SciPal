import type { FastifyPluginAsync } from 'fastify';
import { toPublicPracticeQuestion } from '../schemas/questions.js';
import { msg } from '../practice/servable.js';

// Bồi dưỡng HSG in the exam room: the programming problems of a subject, shown as lesson practice
// shows its programming problems (statement, examples, starter code; never the hidden tests).
// Running and judging go through /api/practice/code/*, which accepts these problems without a lesson.
// Public under the /api/exam/ prefix, like the rest of the exam room.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const failed = msg('Chưa tải được danh sách bài.', 'Could not load the problems.');

export const hsgProblemRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/exam/hsg/problems', async (request, reply) => {
    const slug = String((request.query as { subject?: unknown }).subject ?? '');
    if (!SLUG.test(slug)) return reply.code(400).send(msg('Thiếu môn học.', 'A subject is needed.'));
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(failed);

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, slug, name_vi, name_en, accent_color, archived_at')
      .eq('slug', slug)
      .maybeSingle();
    if (subjectError) {
      request.log.error({ err: subjectError }, 'Failed to load the subject of HSG problems');
      return reply.code(500).send(failed);
    }
    if (!subject || subject.archived_at) return reply.code(404).send(msg('Không có môn này.', 'No such subject.'));

    const { data: rows, error } = await supabase
      .from('questions')
      .select('id, type, difficulty, data, created_at')
      .eq('subject_id', subject.id)
      .eq('type', 'code')
      .eq('usage', 'practice')
      .eq('status', 'published')
      .eq('data->>track', 'hsg')
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) {
      request.log.error({ err: error }, 'Failed to load HSG problems');
      return reply.code(500).send(failed);
    }
    // Problems keep the order they were added in, then by their position in data.order when set.
    const ordered = [...(rows ?? [])].sort((a, b) => orderOf(a.data) - orderOf(b.data));
    return {
      subject: { slug: subject.slug, name_vi: subject.name_vi, name_en: subject.name_en, accent_color: subject.accent_color },
      questions: ordered.map(toPublicPracticeQuestion),
    };
  });
};

function orderOf(data: unknown): number {
  const order = (data as { order?: unknown } | null)?.order;
  return typeof order === 'number' && Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}
