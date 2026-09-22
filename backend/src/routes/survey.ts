import type { FastifyPluginAsync } from 'fastify';

export const surveyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/survey', async (request, reply) => {
    const { type, payload } = (request.body ?? {}) as {
      type?: string;
      payload?: unknown;
    };

    if (!type || !payload) {
      return reply.status(400).send({ error: 'Missing type or payload' });
    }

    const user = (request as any).user as { id?: string; sub?: string } | undefined;
    const userId = user?.id ?? user?.sub ?? null;

    if (app.supabase) {
      try {
        await app.supabase.from('surveys').insert({
          user_id: userId,
          type,
          payload,
        });
      } catch (err) {
        app.log.warn({ err }, 'Failed to insert survey record');
      }
    }

    return reply.status(201).send({ ok: true });
  });
};
