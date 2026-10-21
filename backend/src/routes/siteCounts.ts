import type { FastifyPluginAsync } from 'fastify';

// Public totals the browser cannot count itself (answers and other people's progress are not readable):
// published questions and exams for the landing page, and how many people studied each lesson of a subject.

const CACHE_MS = 5 * 60 * 1000;
const SLUG = /^[a-z0-9-]{1,64}$/;
/** Question ids per request: the ids ride in the URL, which PostgREST refuses past a few kilobytes. */
const PAGE = 200;

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

  const learners = new Map<string, { at: number; body: { counts: Record<string, number> } }>();

  // A learner of a lesson: someone who finished it or answered one of its practice questions.
  app.get('/api/site/lesson-learners', async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send({ error: 'Chưa có số liệu.', error_en: 'No numbers yet.' });
    const slug = (request.query as { subject?: string } | undefined)?.subject ?? '';
    if (!SLUG.test(slug)) return reply.code(400).send({ error: 'Môn học không hợp lệ.', error_en: 'Invalid subject.' });
    const hit = learners.get(slug);
    if (hit && Date.now() - hit.at < CACHE_MS) return reply.send(hit.body);

    const fail = (err: unknown) => {
      request.log.error({ err }, 'Lesson learner counts failed');
      return reply.code(500).send({ error: 'Chưa có số liệu.', error_en: 'No numbers yet.' });
    };
    const subject = await supabase.from('subjects').select('id').eq('slug', slug).maybeSingle();
    if (subject.error) return fail(subject.error);
    if (!subject.data) return reply.send({ counts: {} });
    const lessons = await supabase.from('lessons').select('id').eq('subject_id', (subject.data as { id: string }).id).eq('status', 'published');
    if (lessons.error) return fail(lessons.error);
    const lessonIds = ((lessons.data ?? []) as Array<{ id: string }>).map((l) => l.id);
    const people = new Map<string, Set<string>>(lessonIds.map((id) => [id, new Set()]));

    if (lessonIds.length) {
      const [done, questions] = await Promise.all([
        supabase.from('progress').select('user_id, lesson_id').in('lesson_id', lessonIds),
        supabase.from('questions').select('id, lesson_id').in('lesson_id', lessonIds).eq('usage', 'practice'),
      ]);
      if (done.error || questions.error) return fail(done.error ?? questions.error);
      for (const row of (done.data ?? []) as Array<{ user_id: string; lesson_id: string }>) people.get(row.lesson_id)?.add(row.user_id);
      const lessonOf = new Map(((questions.data ?? []) as Array<{ id: string; lesson_id: string }>).map((q) => [q.id, q.lesson_id]));
      const ids = [...lessonOf.keys()];
      for (let from = 0; from < ids.length; from += PAGE) {
        const answers = await supabase.from('practice_attempts').select('user_id, question_id').in('question_id', ids.slice(from, from + PAGE));
        if (answers.error) return fail(answers.error);
        for (const row of (answers.data ?? []) as Array<{ user_id: string; question_id: string }>) {
          const lesson = lessonOf.get(row.question_id);
          if (lesson) people.get(lesson)?.add(row.user_id);
        }
      }
    }

    const counts: Record<string, number> = {};
    for (const [id, set] of people) if (set.size > 0) counts[id] = set.size;
    const body = { counts };
    learners.set(slug, { at: Date.now(), body });
    return reply.send(body);
  });
};
