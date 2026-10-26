import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const isPublicPath = (path: string): boolean => {
  if (path === '/health' || path === '/api/survey' || path === '/api/survey/website') return true;
  // The plan catalog only; the rest of /api/billing needs a session.
  if (path === '/api/billing/plans') return true;
  // Totals only (published questions and exams, learners per lesson), for the landing and subject pages.
  if (path === '/api/site/counts' || path === '/api/site/lesson-learners') return true;
  // payOS calls this; the handler checks its signature.
  if (['/api/billing/webhooks/vnpay', '/api/billing/webhooks/vnpay/recurring', '/api/internal/billing/vnpay/renewals/run', '/api/billing/vnpay/redirect/:id'].includes(path)) return true;
  if (path === '/api/billing/webhooks/payos') return true;
  if (path === '/api/billing/webhooks/momo' || path === '/api/internal/billing/renewals/run') return true;
  // Visitors can report a problem; the handler limits them by a hash of their address.
  if (path === '/api/problem-reports') return true;
  // Newsletter sign-up; confirm and unsubscribe check a signed token in the body.
  if (path.startsWith('/api/newsletter/')) return true;
  // Study reminders: the cron (checks CRON_SECRET) and the e-mail unsubscribe link (checks a signed token).
  if (path === '/api/internal/reminders/run' || path === '/api/reminders/unsubscribe') return true;
  // Exams and lesson practice need a session (the web asks for one too): a visitor could otherwise read
  // the questions and probe the answers through /api/practice/check.
  // Visitors look up glossary terms and kept entries; only a signed-in learner asks the AI.
  if (path === '/api/dictionary/lookup') return true;
  // A lesson's video: the handler decides from the viewer's plan whether the address is sent.
  if (path === '/api/lessons/:id/video') return true;
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
