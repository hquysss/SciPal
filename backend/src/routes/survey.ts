import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

const SURVEY_TYPES = new Set(['post_lesson', 'demand', 'feature_request']);
const MAX_PAYLOAD_CHARS = 4000;
const unavailable = { error: 'Survey could not be saved. Please try again.' };

export const surveyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/survey', async (request, reply) => {
    const { type, payload } = (request.body ?? {}) as { type?: unknown; payload?: unknown };

    if (typeof type !== 'string' || !SURVEY_TYPES.has(type)) {
      return reply.status(400).send({ error: 'Missing or invalid survey type' });
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return reply.status(400).send({ error: 'Missing or invalid payload' });
    }
    if (JSON.stringify(payload).length > MAX_PAYLOAD_CHARS) {
      return reply.status(400).send({ error: 'Payload too large' });
    }
    if (!app.supabase) return reply.status(503).send(unavailable);

    const user = (request as FastifyRequest & { user?: { id?: string } }).user;
    const { error } = await app.supabase.from('surveys').insert({
      user_id: user?.id ?? null,
      type,
      payload,
    });
    if (error) {
      app.log.warn({ err: error }, 'Failed to insert survey record');
      return reply.status(503).send(unavailable);
    }

    return reply.status(201).send({ ok: true });
  });
};
