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

interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
}

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

    const { data, error } = await app.supabase.auth.admin.listUsers();
    if (error) return reply.code(503).send({ error: error.message });

    return reply.send({ accounts: data.users.map(toAccount) });
  });

  // POST /api/auth/accounts — create user (admin only)
  app.post('/api/auth/accounts', { preHandler: verifyAdmin }, async (req, reply) => {
    if (!app.supabase) {
      return reply.code(503).send({ error: 'Supabase Admin API is not configured' });
    }

    const body = (req.body ?? {}) as Partial<CreateAccountInput>;
    if (!body.display_name?.trim()) {
      return reply.code(400).send({ error: 'display_name is required' });
    }
    if (!body.email?.trim()) {
      return reply.code(400).send({ error: 'email is required' });
    }
    if (!body.password || body.password.length < 8) {
      return reply.code(400).send({ error: 'password must be at least 8 characters' });
    }
    if (!body.app_role || !['student', 'teacher'].includes(body.app_role)) {
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
      if (error.message.includes('already') || (error as any).status === 422) {
        return reply.code(409).send({ error: 'Account already exists' });
      }
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
    const body = (req.body ?? {}) as Partial<UpdateProfileInput>;

    // Validate display_name if provided
    if (body.display_name !== undefined && !body.display_name.trim()) {
      return reply.code(400).send({ error: 'display_name cannot be blank' });
    }

    const updates: Record<string, string> = {};
    if (body.display_name?.trim()) updates['display_name'] = body.display_name.trim();
    if (body.avatar_url !== undefined) updates['avatar_url'] = body.avatar_url;

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
