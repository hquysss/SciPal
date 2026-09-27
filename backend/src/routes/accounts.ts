import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

// ── Types ────────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  display_name: string | null;
  email: string | null;
  app_role: 'admin' | 'student' | 'teacher';
  created_at: string | null;
  last_sign_in_at: string | null;
}

interface CreateAccountInput {
  display_name: string;
  email: string;
  password: string;
  app_role: 'student' | 'teacher';
}

interface UpdateRoleInput {
  app_role: 'student' | 'teacher';
}

const LIST_PAGE_SIZE = 1000;
const MAX_DISPLAY_NAME = 100;
const MAX_AVATAR_URL = 2048;
/** Auth error codes that mean the email is already registered. */
const EXISTING_ACCOUNT_CODES = new Set(['email_exists', 'user_already_exists']);

// ── Helpers ──────────────────────────────────────────────────────────────────

function toAccount(user: any): Account {
  return {
    id: user.id,
    display_name: user.user_metadata?.display_name ?? null,
    email: user.email ?? null,
    app_role: user.app_metadata?.app_role ?? 'student',
    created_at: user.created_at ?? null,
    last_sign_in_at: user.last_sign_in_at ?? null,
  };
}

/** An http(s) URL, or null for anything else. */
function httpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

// preHandler: allows only callers whose JWT has app_role === 'admin'
async function verifyAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user as { app_metadata?: { app_role?: string } } | undefined;
  if (user?.app_metadata?.app_role !== 'admin') {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

// ── Plugin ───────────────────────────────────────────────────────────────────

export const accountsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/auth/accounts — list all users (admin only)
  app.get('/api/auth/accounts', { preHandler: verifyAdmin }, async (_req, reply) => {
    if (!app.supabase) {
      return reply.code(503).send({ error: 'Supabase Admin API is not configured' });
    }

    // listUsers pages (50 per page by default): read every page, not just the first.
    const users: unknown[] = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await app.supabase.auth.admin.listUsers({ page, perPage: LIST_PAGE_SIZE });
      if (error) return reply.code(503).send({ error: error.message });
      users.push(...data.users);
      if (data.users.length < LIST_PAGE_SIZE) break;
    }

    return reply.send({ accounts: users.map(toAccount) });
  });

  // POST /api/auth/accounts — create user (admin only)
  app.post('/api/auth/accounts', { preHandler: verifyAdmin }, async (req, reply) => {
    if (!app.supabase) {
      return reply.code(503).send({ error: 'Supabase Admin API is not configured' });
    }

    const body = (req.body ?? {}) as Partial<Record<keyof CreateAccountInput, unknown>>;
    if (typeof body.display_name !== 'string' || !body.display_name.trim()) {
      return reply.code(400).send({ error: 'display_name is required' });
    }
    if (body.display_name.trim().length > MAX_DISPLAY_NAME) {
      return reply.code(400).send({ error: `display_name must be at most ${MAX_DISPLAY_NAME} characters` });
    }
    if (typeof body.email !== 'string' || !body.email.trim()) {
      return reply.code(400).send({ error: 'email is required' });
    }
    if (typeof body.password !== 'string' || body.password.length < 8) {
      return reply.code(400).send({ error: 'password must be at least 8 characters' });
    }
    if (body.app_role !== 'student' && body.app_role !== 'teacher') {
      return reply.code(400).send({ error: 'app_role must be student or teacher' });
    }

    const { data, error } = await app.supabase.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      user_metadata: { display_name: body.display_name.trim() },
      app_metadata: { app_role: body.app_role },
      email_confirm: true,
    });

    if (error) {
      const code = (error as { code?: string }).code;
      if ((code && EXISTING_ACCOUNT_CODES.has(code)) || error.message.includes('already')) {
        return reply.code(409).send({ error: 'Account already exists' });
      }
      // Other 422s are input the auth server refused (weak password, invalid email): not a conflict.
      if ((error as { status?: number }).status === 422) return reply.code(400).send({ error: error.message });
      return reply.code(503).send({ error: error.message });
    }

    return reply.code(201).send(toAccount(data.user));
  });

  // PATCH /api/auth/accounts/:id/role — update app_role (admin only)
  app.patch('/api/auth/accounts/:id/role', { preHandler: verifyAdmin }, async (req, reply) => {
    if (!app.supabase) {
      return reply.code(503).send({ error: 'Supabase Admin API is not configured' });
    }

    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<UpdateRoleInput>;
    if (!body.app_role || !['student', 'teacher'].includes(body.app_role)) {
      return reply.code(400).send({ error: 'app_role must be student or teacher' });
    }

    const { data, error } = await app.supabase.auth.admin.updateUserById(id, {
      app_metadata: { app_role: body.app_role },
    });

    if (error) {
      if ((error as any).status === 404) return reply.code(404).send({ error: 'User not found' });
      return reply.code(503).send({ error: error.message });
    }

    return reply.send(toAccount(data.user));
  });

  // DELETE /api/auth/accounts/:id — delete user (admin only, cannot delete self)
  app.delete('/api/auth/accounts/:id', { preHandler: verifyAdmin }, async (req, reply) => {
    if (!app.supabase) {
      return reply.code(503).send({ error: 'Supabase Admin API is not configured' });
    }

    const { id } = req.params as { id: string };
    const callerUser = (req as any).user as { id: string };
    if (id === callerUser.id) {
      return reply.code(403).send({ error: 'You cannot delete your own account' });
    }

    const { error } = await app.supabase.auth.admin.deleteUser(id);
    if (error) {
      if ((error as any).status === 404) return reply.code(404).send({ error: 'User not found' });
      return reply.code(503).send({ error: error.message });
    }

    return reply.code(204).send();
  });

  // PATCH /api/auth/profile — self-service profile update (any authenticated user)
  app.patch('/api/auth/profile', async (req, reply) => {
    if (!app.supabase) {
      return reply.code(503).send({ error: 'Supabase not configured' });
    }

    const callerUser = (req as any).user as { id: string };
    const body = (req.body ?? {}) as { display_name?: unknown; avatar_url?: unknown };
    const updates: Record<string, string | null> = {};

    if (body.display_name !== undefined) {
      const name = typeof body.display_name === 'string' ? body.display_name.trim() : '';
      if (!name) return reply.code(400).send({ error: 'display_name cannot be blank' });
      if (name.length > MAX_DISPLAY_NAME) {
        return reply.code(400).send({ error: `display_name must be at most ${MAX_DISPLAY_NAME} characters` });
      }
      updates['display_name'] = name;
    }

    // avatar_url: an http(s) URL, or null / '' to clear it.
    if (body.avatar_url !== undefined) {
      if (body.avatar_url === null || body.avatar_url === '') {
        updates['avatar_url'] = null;
      } else {
        const url = typeof body.avatar_url === 'string' && body.avatar_url.length <= MAX_AVATAR_URL
          ? httpUrl(body.avatar_url.trim())
          : null;
        if (!url) return reply.code(400).send({ error: 'avatar_url must be an http(s) URL' });
        updates['avatar_url'] = url;
      }
    }

    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({ error: 'No fields to update' });
    }

    const { error } = await app.supabase
      .from('profiles')
      .update(updates)
      .eq('id', callerUser.id);

    if (error) return reply.code(500).send({ error: error.message });

    return reply.send({ ok: true });
  });
};
