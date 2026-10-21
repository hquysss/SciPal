import type { FastifyPluginAsync } from 'fastify';

// How much published practice and exam content exists, for the landing page. Visitors cannot read the
// question tables (answers live there), so the backend counts and shares only the two totals.

const CACHE_MS = 5 * 60 * 1000;

export const siteCountRoutes: FastifyPluginAsync = async (app) => {
  let cached: { at: number; body: { questions: number; exams: number } } | null = null;

  app.get('/api/site/counts', async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send({ error: 'Chưa có số liệu.', error_en: 'No numbers yet.' });
    if (cached && Date.now() - cached.at < CACHE_MS) return reply.send(cached.body);
    const [questions, exams] = await Promise.all([
      supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('exam_blueprints').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    ]);
    if (questions.error || exams.error) {
      request.log.error({ err: questions.error ?? exams.error }, 'Site counts failed');
      return reply.code(500).send({ error: 'Chưa có số liệu.', error_en: 'No numbers yet.' });
    }
    cached = { at: Date.now(), body: { questions: questions.count ?? 0, exams: exams.count ?? 0 } };
    return reply.send(cached.body);
  });
};
