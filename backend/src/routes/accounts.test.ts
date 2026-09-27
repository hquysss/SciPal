import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { accountsRoutes } from './accounts.js';

// Helper: build app with mock supabase + inject a fake user on every request
function buildApp(opts: {
  supabase?: any;
  requestUser?: { id: string; app_metadata: { app_role?: string } };
}) {
  const app = Fastify({ logger: false });

  // Mock supabasePlugin effect
  if (opts.supabase) app.decorate('supabase', opts.supabase);

  // Inject user before route handlers
  app.addHook('onRequest', async (req) => {
    if (opts.requestUser) (req as any).user = opts.requestUser;
  });

  app.register(accountsRoutes);
  return app;
}

const adminUser = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const studentUser = { id: 'student-1', app_metadata: { app_role: 'student' } };

describe('GET /api/auth/accounts', () => {
  it('returns 403 when caller is not admin', async () => {
    const app = buildApp({ requestUser: studentUser });
    const res = await app.inject({ method: 'GET', url: '/api/auth/accounts' });
    expect(res.statusCode).toBe(403);
  });

  it('returns 503 when supabase is not configured', async () => {
    const app = buildApp({ requestUser: adminUser }); // no supabase
    const res = await app.inject({ method: 'GET', url: '/api/auth/accounts' });
    expect(res.statusCode).toBe(503);
  });

  it('returns account list when admin and supabase configured', async () => {
    const mockAccounts = [
      {
        id: 'u1',
        email: 'a@b.com',
        app_metadata: { app_role: 'student' },
        user_metadata: { display_name: 'Alice' },
        created_at: '2024-01-01',
        last_sign_in_at: null,
      },
    ];
    const mockSupabase = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: mockAccounts }, error: null }),
        },
      },
    };
    const app = buildApp({ supabase: mockSupabase, requestUser: adminUser });
    const res = await app.inject({ method: 'GET', url: '/api/auth/accounts' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { accounts: unknown[] };
    expect(body.accounts).toHaveLength(1);
    expect((body.accounts[0] as any).email).toBe('a@b.com');
  });
});

describe('DELETE /api/auth/accounts/:id', () => {
  it('returns 403 when admin tries to delete themselves', async () => {
    const mockSupabase = { auth: { admin: { deleteUser: vi.fn() } } };
    const app = buildApp({ supabase: mockSupabase, requestUser: adminUser });
    const res = await app.inject({ method: 'DELETE', url: '/api/auth/accounts/admin-1' });
    expect(res.statusCode).toBe(403);
    expect(mockSupabase.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('returns 204 when deleting a different user', async () => {
    const mockSupabase = {
      auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
    };
    const app = buildApp({ supabase: mockSupabase, requestUser: adminUser });
    const res = await app.inject({ method: 'DELETE', url: '/api/auth/accounts/other-user-id' });
    expect(res.statusCode).toBe(204);
  });
});

describe('POST /api/auth/accounts', () => {
  it('returns 400 when email is missing', async () => {
    const app = buildApp({ supabase: { auth: { admin: {} } }, requestUser: adminUser });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/accounts',
      payload: { display_name: 'Bob', password: 'secret123', app_role: 'student' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 201 on success', async () => {
    const created = {
      id: 'new-1',
      email: 'new@test.com',
      app_metadata: { app_role: 'student' },
      user_metadata: { display_name: 'Bob' },
      created_at: '2024-01-01',
      last_sign_in_at: null,
    };
    const mockSupabase = {
      auth: {
        admin: { createUser: vi.fn().mockResolvedValue({ data: { user: created }, error: null }) },
      },
    };
    const app = buildApp({ supabase: mockSupabase, requestUser: adminUser });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/accounts',
      payload: {
        display_name: 'Bob',
        email: 'new@test.com',
        password: 'secret123',
        app_role: 'student',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toMatchObject({ id: 'new-1', email: 'new@test.com' });
  });
});

describe('PATCH /api/auth/accounts/:id/role', () => {
  it('returns 403 for non-admin', async () => {
    const app = buildApp({ requestUser: studentUser });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/auth/accounts/u1/role',
      payload: { app_role: 'teacher' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /api/auth/profile', () => {
  it('updates display_name in profiles table', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    const mockSupabase = { from: mockFrom };
    const app = buildApp({ supabase: mockSupabase, requestUser: adminUser });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/auth/profile',
      payload: { display_name: 'New Name' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 400 when display_name is empty string', async () => {
    const app = buildApp({ supabase: {}, requestUser: adminUser });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/auth/profile',
      payload: { display_name: '   ' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('account route input and error handling', () => {
  const user = (id: string) => ({ id, email: `${id}@test.com`, app_metadata: {}, user_metadata: {} });

  it('lists every page of users, not only the first', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => user(`u${i}`));
    const listUsers = vi.fn()
      .mockResolvedValueOnce({ data: { users: firstPage }, error: null })
      .mockResolvedValueOnce({ data: { users: [user('last')] }, error: null });
    const app = buildApp({ supabase: { auth: { admin: { listUsers } } }, requestUser: adminUser });
    const res = await app.inject({ method: 'GET', url: '/api/auth/accounts' });
    expect(res.statusCode).toBe(200);
    expect(res.json().accounts).toHaveLength(1001);
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1000 });
  });

  it('reports a refused password as bad input, not as an existing account', async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Password is too weak', status: 422, code: 'weak_password' },
    });
    const app = buildApp({ supabase: { auth: { admin: { createUser } } }, requestUser: adminUser });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/accounts',
      payload: { display_name: 'Bob', email: 'bob@test.com', password: 'password', app_role: 'student' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('still reports a registered email as a conflict', async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'A user with this email address has been registered', status: 422, code: 'email_exists' },
    });
    const app = buildApp({ supabase: { auth: { admin: { createUser } } }, requestUser: adminUser });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/accounts',
      payload: { display_name: 'Bob', email: 'bob@test.com', password: 'secret123', app_role: 'student' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('rejects a non-string display_name with 400 instead of crashing', async () => {
    const app = buildApp({ supabase: {}, requestUser: adminUser });
    const res = await app.inject({ method: 'PATCH', url: '/api/auth/profile', payload: { display_name: 42 } });
    expect(res.statusCode).toBe(400);
  });

  it('accepts only an http(s) avatar_url, and null to clear it', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const app = buildApp({ supabase: { from: vi.fn().mockReturnValue({ update }) }, requestUser: adminUser });
    for (const bad of ['javascript:alert(1)', 'not a url', 7]) {
      const res = await app.inject({ method: 'PATCH', url: '/api/auth/profile', payload: { avatar_url: bad } });
      expect(res.statusCode).toBe(400);
    }
    expect(update).not.toHaveBeenCalled();
    const ok = await app.inject({ method: 'PATCH', url: '/api/auth/profile', payload: { avatar_url: 'https://cdn.test/a.png' } });
    expect(ok.statusCode).toBe(200);
    const cleared = await app.inject({ method: 'PATCH', url: '/api/auth/profile', payload: { avatar_url: null } });
    expect(cleared.statusCode).toBe(200);
    expect(update).toHaveBeenLastCalledWith({ avatar_url: null });
  });
});
