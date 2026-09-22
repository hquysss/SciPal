import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createClient } from '@supabase/supabase-js';

const PUBLIC_PATHS = new Set(['/health']);

export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    if (PUBLIC_PATHS.has(req.routeOptions?.url ?? req.url)) return;

    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing authorization header' });
    }

    const token = header.slice(7);
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return reply.code(401).send({ error: 'Invalid token' });
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return reply.code(401).send({ error: 'Invalid token' });
      }

      (req as FastifyRequest & { user: typeof user }).user = user;
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });
});
