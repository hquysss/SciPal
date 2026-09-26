import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const isPublicPath = (path: string): boolean => {
  if (path === '/health' || path === '/api/survey') return true;
  if (path.startsWith('/api/exam/')) return true;
  return false;
};

let verifier: SupabaseClient | null = null;

function getVerifier(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  verifier ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return verifier;
}

async function resolveUser(header: string | undefined): Promise<User | null> {
  if (!header?.startsWith('Bearer ')) return null;
  const client = getVerifier();
  if (!client) return null;
  try {
    const { data: { user }, error } = await client.auth.getUser(header.slice(7));
    return error ? null : user;
  } catch {
    return null;
  }
}

export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const url = req.routeOptions?.url ?? req.url;
    const header = req.headers.authorization;
    const user = await resolveUser(header);

    if (user) {
      (req as FastifyRequest & { user: User }).user = user;
      return;
    }
    // Public paths accept anonymous callers, including stale or invalid tokens.
    if (isPublicPath(url)) return;

    if (!header?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing authorization header' });
    }
    return reply.code(401).send({ error: 'Invalid token' });
  });
});
