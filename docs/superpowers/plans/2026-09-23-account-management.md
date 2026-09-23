# Account Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Katha-style admin account management dashboard (`/admin/accounts`) and a self-service profile edit modal for SciPal, backed by Fastify routes that use Supabase Service Role Key to manage `app_metadata.app_role`.

**Architecture:** `app_role` (`admin | student | teacher`) lives in `auth.users.app_metadata` — only writable via `SUPABASE_SERVICE_ROLE_KEY` on the backend. The frontend reads `app_role` from the Supabase session JWT for guard checks. Admin routes in Fastify verify the calling user's `app_role === 'admin'` via a `preHandler` hook before touching the Supabase Admin API.

**Tech Stack:** TypeScript, Fastify 4, `@supabase/supabase-js` (Admin API), Next.js 15 App Router (`use client`), Tailwind CSS, `useLanguage()` from `@scipal/hooks`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-account-management-design.md`

## Global Constraints

- `SUPABASE_SERVICE_ROLE_KEY` only in `backend/.env` — never in `frontend/` or `packages/`
- All UI copy uses `useLanguage()` hook — `t({ en: '...', vi: '...' })` pattern
- `app_metadata.app_role` set exclusively by Fastify backend via Admin API
- `profiles.role` (`student | teacher`) is separate — for learning UX only, not auth
- Bilingual: all user-facing strings provide `{ en, vi }` pairs
- No hard-coded subject accent colors; use `var(--accent, #10b981)`
- pnpm workspace commands: `pnpm --filter @scipal/api <cmd>`, `pnpm --filter @scipal/web <cmd>`
- All tests run with: `pnpm test` (root), typecheck: `pnpm typecheck`
- Commits in English, imperative mood: `feat(accounts): ...`

## Review Focus

1. **Admin deletes their own account** — `DELETE /api/auth/accounts/:id` must return 403 if `id === calling admin's id`. Test this with matched IDs.
2. **Non-admin calls admin endpoints** — `student` JWT calling `GET /api/auth/accounts` must get 403, not 200. Test with a non-admin token.
3. **Missing Supabase env vars** — when `SUPABASE_SERVICE_ROLE_KEY` is absent, all admin endpoints return 503 (not 500 crash). Test with `app.supabase` undefined.
4. **`RequireAdmin` with `status === 'loading'`** — guard must show loading screen (not access-denied) while session loads. Test with `status = 'loading'` + no user.
5. **`ProfileEditModal` empty display_name** — submitting a blank display_name must be rejected client-side before the API call. Test the validation path.

---

## Task 1: Backend — `verifyAdmin` preHandler + `accountsRoutes` skeleton

**Files:**
- Create: `backend/src/routes/accounts.ts`
- Modify: `backend/src/index.ts` (lines 1–28)
- Test: `backend/src/routes/accounts.test.ts`

**Interfaces:**
- Consumes: `app.supabase` (type `SupabaseClient | undefined`) from `supabasePlugin`; `(req as any).user` (type `{ id: string; app_metadata: { app_role?: string } }`) set by `authPlugin`
- Produces: `accountsRoutes: FastifyPluginAsync` — exported from `backend/src/routes/accounts.ts`; five endpoints registered under `/api/auth/`

- [ ] **Step 1: Write the failing tests**

Create `backend/src/routes/accounts.test.ts`:

```typescript
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
      { id: 'u1', email: 'a@b.com', app_metadata: { app_role: 'student' },
        user_metadata: { display_name: 'Alice' }, created_at: '2024-01-01', last_sign_in_at: null }
    ];
    const mockSupabase = {
      auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: mockAccounts }, error: null }) } }
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
      auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } }
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
      method: 'POST', url: '/api/auth/accounts',
      payload: { display_name: 'Bob', password: 'secret123', app_role: 'student' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 201 on success', async () => {
    const created = { id: 'new-1', email: 'new@test.com', app_metadata: { app_role: 'student' },
      user_metadata: { display_name: 'Bob' }, created_at: '2024-01-01', last_sign_in_at: null };
    const mockSupabase = {
      auth: { admin: { createUser: vi.fn().mockResolvedValue({ data: { user: created }, error: null }) } }
    };
    const app = buildApp({ supabase: mockSupabase, requestUser: adminUser });
    const res = await app.inject({
      method: 'POST', url: '/api/auth/accounts',
      payload: { display_name: 'Bob', email: 'new@test.com', password: 'secret123', app_role: 'student' },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toMatchObject({ id: 'new-1', email: 'new@test.com' });
  });
});

describe('PATCH /api/auth/accounts/:id/role', () => {
  it('returns 403 for non-admin', async () => {
    const app = buildApp({ requestUser: studentUser });
    const res = await app.inject({
      method: 'PATCH', url: '/api/auth/accounts/u1/role',
      payload: { app_role: 'teacher' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /api/auth/profile', () => {
  it('updates display_name in profiles table', async () => {
    const mockFrom = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    const mockSupabase = { from: vi.fn().mockReturnValue(mockFrom) };
    const app = buildApp({ supabase: mockSupabase, requestUser: adminUser });
    const res = await app.inject({
      method: 'PATCH', url: '/api/auth/profile',
      payload: { display_name: 'New Name' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 400 when display_name is empty string', async () => {
    const app = buildApp({ supabase: {}, requestUser: adminUser });
    const res = await app.inject({
      method: 'PATCH', url: '/api/auth/profile',
      payload: { display_name: '   ' },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to confirm RED**

```powershell
pnpm --filter @scipal/api test
```

Expected: multiple FAIL — `accountsRoutes` does not exist yet.

- [ ] **Step 3: Implement `backend/src/routes/accounts.ts`**

```typescript
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

// Prehandler: allows only callers whose JWT has app_role === 'admin'
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
    if (!app.supabase) return reply.code(503).send({ error: 'Supabase Admin API is not configured' });

    const { data, error } = await app.supabase.auth.admin.listUsers();
    if (error) return reply.code(503).send({ error: error.message });

    return reply.send({ accounts: data.users.map(toAccount) });
  });

  // POST /api/auth/accounts — create user (admin only)
  app.post('/api/auth/accounts', { preHandler: verifyAdmin }, async (req, reply) => {
    if (!app.supabase) return reply.code(503).send({ error: 'Supabase Admin API is not configured' });

    const body = (req.body ?? {}) as Partial<CreateAccountInput>;
    if (!body.display_name?.trim()) return reply.code(400).send({ error: 'display_name is required' });
    if (!body.email?.trim()) return reply.code(400).send({ error: 'email is required' });
    if (!body.password || body.password.length < 8) return reply.code(400).send({ error: 'password must be at least 8 characters' });
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
      if (error.message.includes('already') || error.status === 422) {
        return reply.code(409).send({ error: 'Account already exists' });
      }
      return reply.code(503).send({ error: error.message });
    }

    return reply.code(201).send(toAccount(data.user));
  });

  // PATCH /api/auth/accounts/:id/role — update app_role (admin only)
  app.patch('/api/auth/accounts/:id/role', { preHandler: verifyAdmin }, async (req, reply) => {
    if (!app.supabase) return reply.code(503).send({ error: 'Supabase Admin API is not configured' });

    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<UpdateRoleInput>;
    if (!body.app_role || !['student', 'teacher'].includes(body.app_role)) {
      return reply.code(400).send({ error: 'app_role must be student or teacher' });
    }

    const { data, error } = await app.supabase.auth.admin.updateUserById(id, {
      app_metadata: { app_role: body.app_role },
    });

    if (error) {
      if (error.status === 404) return reply.code(404).send({ error: 'User not found' });
      return reply.code(503).send({ error: error.message });
    }

    return reply.send(toAccount(data.user));
  });

  // DELETE /api/auth/accounts/:id — delete user (admin only, cannot delete self)
  app.delete('/api/auth/accounts/:id', { preHandler: verifyAdmin }, async (req, reply) => {
    if (!app.supabase) return reply.code(503).send({ error: 'Supabase Admin API is not configured' });

    const { id } = req.params as { id: string };
    const callerUser = (req as any).user as { id: string };
    if (id === callerUser.id) {
      return reply.code(403).send({ error: 'You cannot delete your own account' });
    }

    const { error } = await app.supabase.auth.admin.deleteUser(id);
    if (error) {
      if (error.status === 404) return reply.code(404).send({ error: 'User not found' });
      return reply.code(503).send({ error: error.message });
    }

    return reply.code(204).send();
  });

  // PATCH /api/auth/profile — self-service profile update (any authenticated user)
  app.patch('/api/auth/profile', async (req, reply) => {
    if (!app.supabase) return reply.code(503).send({ error: 'Supabase not configured' });

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
```

- [ ] **Step 4: Register `accountsRoutes` in `backend/src/index.ts`**

Add after the existing route imports (line 10) and registrations (line 21):

```typescript
// Add import (after line 10):
import { accountsRoutes } from './routes/accounts.js';

// Add registration (after line 21):
await app.register(accountsRoutes);
```

- [ ] **Step 5: Run tests to confirm GREEN**

```powershell
pnpm --filter @scipal/api test
```

Expected: all `accounts.test.ts` tests PASS. All previous tests still PASS.

- [ ] **Step 6: Typecheck**

```powershell
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```powershell
git add backend/src/routes/accounts.ts backend/src/routes/accounts.test.ts backend/src/index.ts
git commit -m "feat(accounts): add admin account management routes with verifyAdmin guard"
```

---

## Task 2: Backend — `seed-admin` script

**Files:**
- Create: `backend/scripts/seed-admin.ts`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from env; first CLI arg is user email or UUID
- Produces: Updates `app_metadata.app_role = 'admin'` for the target user

- [ ] **Step 1: Create `backend/scripts/seed-admin.ts`**

```typescript
/**
 * One-time script to grant admin role to a user.
 * Usage: pnpm --filter @scipal/api tsx scripts/seed-admin.ts <email_or_uuid>
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const target = process.argv[2];
if (!target) {
  console.error('Usage: tsx scripts/seed-admin.ts <email_or_uuid>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(url, key);

// Resolve email → UUID if necessary
let userId = target;
const isEmail = target.includes('@');
if (isEmail) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error('listUsers error:', error.message); process.exit(1); }
  const found = data.users.find((u) => u.email === target);
  if (!found) { console.error(`No user with email: ${target}`); process.exit(1); }
  userId = found.id;
}

const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  app_metadata: { app_role: 'admin' },
});

if (error) {
  console.error('Failed to set admin role:', error.message);
  process.exit(1);
}

console.log(`✅ app_role set to 'admin' for user: ${data.user.email ?? userId}`);
```

- [ ] **Step 2: Verify script runs without crashing (dry-run check)**

```powershell
# Verify TypeScript compiles — do NOT run against real Supabase yet
pnpm --filter @scipal/api tsx --check scripts/seed-admin.ts
```

Expected: no TypeScript errors printed.

- [ ] **Step 3: Commit**

```powershell
git add backend/scripts/seed-admin.ts
git commit -m "feat(accounts): add seed-admin script to grant app_role admin via CLI"
```

---

## Task 3: Frontend — `accountsApi.ts` + `RequireAdmin` guard

**Files:**
- Create: `frontend/features/admin/accountsApi.ts`
- Create: `frontend/features/admin/RequireAdmin.tsx`
- Test: `frontend/features/admin/RequireAdmin.test.tsx`

**Interfaces:**
- Consumes: `createBrowserClient` from `@/lib/supabase`; Supabase session `user.app_metadata.app_role`
- Produces:
  - `listAccounts(signal?): Promise<Account[]>`
  - `createAccount(input: CreateAccountInput): Promise<Account>`
  - `updateAccountRole(id, role): Promise<Account>`
  - `deleteAccount(id): Promise<void>`
  - `updateSelfProfile(input: UpdateProfileInput): Promise<void>`
  - `RequireAdmin` — React component that gates children to admin users only

- [ ] **Step 1: Write `frontend/features/admin/accountsApi.ts`**

```typescript
// frontend/features/admin/accountsApi.ts

export interface Account {
  id: string;
  display_name: string | null;
  email: string | null;
  app_role: 'admin' | 'student' | 'teacher';
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface CreateAccountInput {
  display_name: string;
  email: string;
  password: string;
  app_role: 'student' | 'teacher';
}

export interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { createBrowserClient } = await import('@/lib/supabase');
  const supabase = createBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw Object.assign(new Error(body.error ?? res.statusText), { status: res.status });
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export async function listAccounts(signal?: AbortSignal): Promise<Account[]> {
  const data = await apiFetch<{ accounts: Account[] }>('/api/auth/accounts', { signal });
  return data.accounts;
}

export function createAccount(input: CreateAccountInput): Promise<Account> {
  return apiFetch<Account>('/api/auth/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAccountRole(id: string, role: 'student' | 'teacher'): Promise<Account> {
  return apiFetch<Account>(`/api/auth/accounts/${encodeURIComponent(id)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ app_role: role }),
  });
}

export function deleteAccount(id: string): Promise<void> {
  return apiFetch<void>(`/api/auth/accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function updateSelfProfile(input: UpdateProfileInput): Promise<void> {
  return apiFetch<void>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
```

- [ ] **Step 2: Write failing test for `RequireAdmin`**

Create `frontend/features/admin/RequireAdmin.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequireAdmin } from './RequireAdmin';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/accounts',
}));

// Mock @scipal/hooks
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ t: (o: { en: string }) => o.en, lang: 'en' }),
}));

// Helper to mock useAuth state
let mockAuthState: { status: string; user: any } = { status: 'loading', user: null };
vi.mock('@/lib/supabase', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}));

// For simplicity, RequireAdmin reads from a passed `authStatus` prop (see implementation below)
describe('RequireAdmin', () => {
  it('renders loading when status is loading', () => {
    render(<RequireAdmin authStatus="loading" appRole={undefined}><div>secret</div></RequireAdmin>);
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.getByText(/verifying/i)).toBeTruthy();
  });

  it('renders access denied when authenticated but not admin', () => {
    render(<RequireAdmin authStatus="authenticated" appRole="student"><div>secret</div></RequireAdmin>);
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.getByText(/access denied/i)).toBeTruthy();
  });

  it('renders children when admin', () => {
    render(<RequireAdmin authStatus="authenticated" appRole="admin"><div>secret</div></RequireAdmin>);
    expect(screen.getByText('secret')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests to confirm RED**

```powershell
pnpm --filter @scipal/web test -- --reporter=verbose RequireAdmin
```

Expected: FAIL — `RequireAdmin` not found.

- [ ] **Step 4: Implement `frontend/features/admin/RequireAdmin.tsx`**

```tsx
'use client';
// RequireAdmin accepts explicit props so it's testable without real Supabase.
// The page.tsx wrapper (Task 4) reads the real session and passes props down.

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';

interface RequireAdminProps {
  children: React.ReactNode;
  /** Supabase auth status: 'loading' | 'authenticated' | 'unauthenticated' */
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  /** Value of user.app_metadata.app_role, or undefined when loading/unauthenticated */
  appRole: string | undefined;
  onSignOut?: () => void;
}

export function RequireAdmin({ children, authStatus, appRole, onSignOut }: RequireAdminProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authStatus, pathname, router]);

  const isAdmin = appRole === 'admin';

  // Loading state
  if (authStatus === 'loading' || authStatus === 'unauthenticated') {
    return (
      <main className="grid min-h-screen place-items-center bg-gradient-to-br from-emerald-950 to-emerald-900">
        <p className="text-emerald-300 text-sm animate-pulse">
          {t({ en: 'Verifying session…', vi: 'Đang xác thực phiên…' })}
        </p>
      </main>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center bg-science-grid px-5">
        <section className="w-full max-w-md rounded-3xl border border-red-200/30 bg-white/90 p-8 text-center shadow-2xl dark:bg-card/90">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-red-100 dark:bg-red-950/40 text-2xl">
            🔒
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {t({ en: 'Access Denied', vi: 'Không có quyền truy cập' })}
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {t({ en: 'This page is restricted to administrators only.', vi: 'Trang này chỉ dành cho quản trị viên.' })}
          </p>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="mt-6 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900"
            >
              {t({ en: 'Sign Out', vi: 'Đăng xuất' })}
            </button>
          )}
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Run tests to confirm GREEN**

```powershell
pnpm --filter @scipal/web test -- --reporter=verbose RequireAdmin
```

Expected: all 3 RequireAdmin tests PASS.

- [ ] **Step 6: Typecheck**

```powershell
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```powershell
git add frontend/features/admin/accountsApi.ts frontend/features/admin/RequireAdmin.tsx frontend/features/admin/RequireAdmin.test.tsx
git commit -m "feat(accounts): add accountsApi client and RequireAdmin guard"
```

---

## Task 4: Frontend — `AdminAccountsPage` + route

**Files:**
- Create: `frontend/features/admin/AdminAccountsPage.tsx`
- Create: `frontend/app/admin/accounts/page.tsx`
- Test: `frontend/features/admin/AdminAccountsPage.test.tsx`

**Interfaces:**
- Consumes: `listAccounts`, `createAccount`, `updateAccountRole`, `deleteAccount` from `./accountsApi`; `Account`, `CreateAccountInput` types; `RequireAdmin` from `./RequireAdmin`; `useLanguage` from `@scipal/hooks`
- Produces: `AdminAccountsPage` React component (client); `page.tsx` server component that reads Supabase session and passes `authStatus`/`appRole` to `RequireAdmin`

- [ ] **Step 1: Write failing tests**

Create `frontend/features/admin/AdminAccountsPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminAccountsPage } from './AdminAccountsPage';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ t: (o: { en: string }) => o.en, lang: 'en' }),
}));

const mockAccounts = [
  { id: 'u1', email: 'alice@test.com', display_name: 'Alice', app_role: 'student', created_at: '2024-01-01', last_sign_in_at: null },
  { id: 'u2', email: 'bob@test.com', display_name: 'Bob', app_role: 'teacher', created_at: '2024-01-02', last_sign_in_at: '2024-06-01' },
];

vi.mock('./accountsApi', () => ({
  listAccounts: vi.fn().mockResolvedValue(mockAccounts),
  createAccount: vi.fn().mockResolvedValue({ id: 'new', email: 'new@test.com', display_name: 'New', app_role: 'student', created_at: '2024-01-03', last_sign_in_at: null }),
  updateAccountRole: vi.fn().mockResolvedValue({ ...mockAccounts[0], app_role: 'teacher' }),
  deleteAccount: vi.fn().mockResolvedValue(undefined),
}));

describe('AdminAccountsPage', () => {
  it('renders the page heading', async () => {
    render(<AdminAccountsPage />);
    expect(screen.getByText(/Account Management/i)).toBeTruthy();
  });

  it('lists accounts after load', async () => {
    render(<AdminAccountsPage />);
    await waitFor(() => expect(screen.getByText('alice@test.com')).toBeTruthy());
    expect(screen.getByText('bob@test.com')).toBeTruthy();
  });

  it('shows form validation error when email is missing on submit', async () => {
    render(<AdminAccountsPage />);
    const submit = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByText(/email is required/i)).toBeTruthy());
  });

  it('shows role badge for each account', async () => {
    render(<AdminAccountsPage />);
    await waitFor(() => expect(screen.getAllByText(/student/i).length).toBeGreaterThan(0));
  });
});
```

- [ ] **Step 2: Run tests to confirm RED**

```powershell
pnpm --filter @scipal/web test -- --reporter=verbose AdminAccountsPage
```

Expected: FAIL — `AdminAccountsPage` not found.

- [ ] **Step 3: Implement `frontend/features/admin/AdminAccountsPage.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import {
  listAccounts, createAccount, updateAccountRole, deleteAccount,
  type Account, type CreateAccountInput,
} from './accountsApi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ListState = 'loading' | 'ready' | 'error';

export function AdminAccountsPage() {
  const { t } = useLanguage();

  // ── Form state ────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── List state ────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [listState, setListState] = useState<ListState>('loading');
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    setListState('loading');
    try {
      setAccounts(await listAccounts(signal));
      setListState('ready');
    } catch (err: any) {
      if (signal?.aborted) return;
      setListError(err?.message ?? 'Failed to load accounts');
      setListState('error');
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void loadAccounts(ctrl.signal);
    return () => ctrl.abort();
  }, [loadAccounts]);

  function validateForm(): string | null {
    if (!displayName.trim()) return t({ en: 'Name is required', vi: 'Tên hiển thị là bắt buộc' });
    if (!email.trim()) return t({ en: 'Email is required', vi: 'Email là bắt buộc' });
    if (!EMAIL_RE.test(email.trim())) return t({ en: 'Invalid email address', vi: 'Địa chỉ email không hợp lệ' });
    if (!password) return t({ en: 'Password is required', vi: 'Mật khẩu là bắt buộc' });
    if (password.length < 8) return t({ en: 'Password must be at least 8 characters', vi: 'Mật khẩu tối thiểu 8 ký tự' });
    if (password !== passwordConfirm) return t({ en: 'Passwords do not match', vi: 'Mật khẩu không khớp' });
    return null;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null); setFormSuccess(null);
    const err = validateForm();
    if (err) { setFormError(err); return; }

    setSubmitting(true);
    try {
      const created = await createAccount({ display_name: displayName.trim(), email: email.trim(), password, app_role: role });
      setAccounts((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
      setFormSuccess(t({ en: `Account created: ${created.email}`, vi: `Đã tạo tài khoản: ${created.email}` }));
      setDisplayName(''); setEmail(''); setPassword(''); setPasswordConfirm(''); setRole('student');
    } catch (err: any) {
      if (err?.status === 409) setFormError(t({ en: 'Email already in use', vi: 'Email đã tồn tại' }));
      else setFormError(err?.message ?? t({ en: 'Failed to create account', vi: 'Không thể tạo tài khoản' }));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleToggle(account: Account) {
    if (updatingId || deletingId) return;
    const next: 'student' | 'teacher' = account.app_role === 'student' ? 'teacher' : 'student';
    setUpdatingId(account.id);
    try {
      const updated = await updateAccountRole(account.id, next);
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? updated : a)));
      setFeedback(t({ en: `Role updated for ${account.email}`, vi: `Đã cập nhật vai trò cho ${account.email}` }));
    } catch (err: any) {
      setListError(err?.message ?? t({ en: 'Failed to update role', vi: 'Không thể cập nhật vai trò' }));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete || deletingId) return;
    const target = confirmDelete;
    setDeletingId(target.id); setConfirmDelete(null);
    try {
      await deleteAccount(target.id);
      setAccounts((prev) => prev.filter((a) => a.id !== target.id));
      setFeedback(t({ en: `Deleted: ${target.email}`, vi: `Đã xóa: ${target.email}` }));
    } catch (err: any) {
      setListError(err?.message ?? t({ en: 'Failed to delete account', vi: 'Không thể xóa tài khoản' }));
    } finally {
      setDeletingId(null);
    }
  }

  const rolePill = (r: string) => {
    const styles: Record<string, string> = {
      admin: 'border-purple-300/50 bg-purple-100/80 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
      teacher: 'border-blue-300/50 bg-blue-100/80 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
      student: 'border-emerald-300/50 bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    };
    const labels: Record<string, { en: string; vi: string }> = {
      admin: { en: 'Admin', vi: 'Quản trị' },
      teacher: { en: 'Teacher', vi: 'Giáo viên' },
      student: { en: 'Student', vi: 'Học sinh' },
    };
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles[r] ?? styles.student}`}>
        {t(labels[r] ?? labels.student)}
      </span>
    );
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
      {/* Header */}
      <div className="max-w-3xl mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
          {t({ en: 'Administration', vi: 'Quản trị hệ thống' })}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t({ en: 'Account Management', vi: 'Quản lý tài khoản' })}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t({ en: 'Create, manage roles, and remove learner and educator accounts.', vi: 'Tạo, phân quyền và xóa tài khoản học sinh và giáo viên.' })}
        </p>
      </div>

      {/* 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.4fr)]">

        {/* ── Create form (left) ─────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-card/90">
          <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/10 dark:bg-white/5 sm:px-7">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
              {t({ en: 'New Account', vi: 'Tạo tài khoản mới' })}
            </span>
            <div className="mt-1 flex items-center gap-2">
              {rolePill(role)}
              <span className="min-w-0 truncate text-xs text-gray-400">{displayName.trim() || t({ en: 'Unnamed', vi: 'Chưa đặt tên' })}</span>
            </div>
          </div>

          <form className="space-y-5 p-5 sm:p-7" onSubmit={handleCreate} noValidate>
            {/* Role selector */}
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t({ en: 'Role', vi: 'Vai trò' })}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(['student', 'teacher'] as const).map((r) => (
                  <label key={r} className={`cursor-pointer rounded-2xl border px-4 py-3 text-center text-sm font-bold transition ${role === r ? 'border-emerald-400/60 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 dark:border-white/10 dark:bg-white/5'}`}>
                    <input className="sr-only" type="radio" name="account-role" value={r} checked={role === r} onChange={() => setRole(r)} />
                    {t(r === 'student' ? { en: 'Student', vi: 'Học sinh' } : { en: 'Teacher', vi: 'Giáo viên' })}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Fields */}
            {[
              { id: 'dn', label: { en: 'Display Name', vi: 'Tên hiển thị' }, value: displayName, setter: setDisplayName, type: 'text' },
              { id: 'em', label: { en: 'Email', vi: 'Email' }, value: email, setter: setEmail, type: 'email' },
              { id: 'pw', label: { en: 'Password', vi: 'Mật khẩu' }, value: password, setter: setPassword, type: 'password' },
              { id: 'pc', label: { en: 'Confirm Password', vi: 'Xác nhận mật khẩu' }, value: passwordConfirm, setter: setPasswordConfirm, type: 'password' },
            ].map(({ id, label, value, setter, type }) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t(label)}
                </label>
                <input
                  id={id}
                  type={type}
                  value={value}
                  onChange={(e) => { setter(e.target.value); setFormError(null); setFormSuccess(null); }}
                  disabled={submitting}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            ))}

            {formError && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{formError}</p>}
            {formSuccess && <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{formSuccess}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? t({ en: 'Creating…', vi: 'Đang tạo…' }) : t({ en: 'Create Account', vi: 'Tạo tài khoản' })}
            </button>
          </form>
        </section>

        {/* ── Account list (right) ───────────────────────────────────────── */}
        <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-card/90">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/10 sm:px-7">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
              {t({ en: 'All Accounts', vi: 'Danh sách tài khoản' })}
              {listState === 'ready' && <span className="ml-2 text-emerald-600">({accounts.length})</span>}
            </span>
            <button onClick={() => void loadAccounts()} className="rounded-lg px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition">
              {t({ en: 'Refresh', vi: 'Tải lại' })}
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {feedback && (
              <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {feedback}
              </div>
            )}
            {listError && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {listError}
              </div>
            )}

            {listState === 'loading' && (
              <div className="py-12 text-center text-sm text-gray-400 animate-pulse">
                {t({ en: 'Loading accounts…', vi: 'Đang tải danh sách…' })}
              </div>
            )}

            {listState === 'ready' && accounts.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-400">
                {t({ en: 'No accounts yet.', vi: 'Chưa có tài khoản nào.' })}
              </div>
            )}

            {listState === 'ready' && accounts.length > 0 && (
              <ul className="divide-y divide-gray-100 dark:divide-white/10">
                {accounts.map((account) => (
                  <li key={account.id} className="flex flex-wrap items-center gap-3 py-4">
                    {/* Avatar placeholder */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {(account.display_name ?? account.email ?? '?')[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {account.display_name ?? t({ en: 'Unnamed', vi: 'Chưa đặt tên' })}
                      </p>
                      <p className="truncate text-xs text-gray-500">{account.email}</p>
                    </div>

                    {/* Role badge */}
                    {rolePill(account.app_role)}

                    {/* Actions (not for admin accounts) */}
                    {account.app_role !== 'admin' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void handleRoleToggle(account)}
                          disabled={!!updatingId || !!deletingId}
                          className="rounded-lg px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 transition disabled:opacity-40"
                        >
                          {updatingId === account.id
                            ? '…'
                            : account.app_role === 'student'
                              ? t({ en: '→ Teacher', vi: '→ Giáo viên' })
                              : t({ en: '→ Student', vi: '→ Học sinh' })}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(account)}
                          disabled={!!deletingId}
                          className="rounded-lg px-2.5 py-1 text-xs font-bold text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition disabled:opacity-40"
                        >
                          {deletingId === account.id ? '…' : t({ en: 'Delete', vi: 'Xóa' })}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* ── Delete confirm dialog ──────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-card">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t({ en: 'Delete Account?', vi: 'Xóa tài khoản?' })}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t({ en: `This will permanently remove ${confirmDelete.email}.`, vi: `Thao tác này sẽ xóa vĩnh viễn ${confirmDelete.email}.` })}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300"
              >
                {t({ en: 'Cancel', vi: 'Hủy' })}
              </button>
              <button
                onClick={() => void handleDelete()}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700"
              >
                {t({ en: 'Delete', vi: 'Xóa' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Create the Next.js route page**

Create `frontend/app/admin/accounts/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { RequireAdmin } from '@/features/admin/RequireAdmin';
import { AdminAccountsPage } from '@/features/admin/AdminAccountsPage';

export const metadata: Metadata = {
  title: 'Quản lý tài khoản — SciPal Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminAccountsRoute() {
  let authStatus: 'loading' | 'authenticated' | 'unauthenticated' = 'unauthenticated';
  let appRole: string | undefined;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore as any);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      authStatus = 'authenticated';
      appRole = (user.app_metadata as any)?.app_role;
    }
  } catch {
    authStatus = 'unauthenticated';
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid">
      <RequireAdmin authStatus={authStatus} appRole={appRole}>
        <AdminAccountsPage />
      </RequireAdmin>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to confirm GREEN**

```powershell
pnpm --filter @scipal/web test -- --reporter=verbose AdminAccountsPage
```

Expected: all 4 AdminAccountsPage tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/features/admin/AdminAccountsPage.tsx frontend/features/admin/AdminAccountsPage.test.tsx frontend/app/admin/accounts/page.tsx
git commit -m "feat(accounts): add AdminAccountsPage and /admin/accounts route"
```

---

## Task 5: Frontend — `ProfileEditModal` + AccountSettings integration

**Files:**
- Create: `frontend/features/profile/ProfileEditModal.tsx`
- Modify: `frontend/features/profile/AccountSettings.tsx` (add "Chỉnh sửa hồ sơ" button)
- Test: `frontend/features/profile/ProfileEditModal.test.tsx`

**Interfaces:**
- Consumes: `updateSelfProfile(input: UpdateProfileInput): Promise<void>` from `@/features/admin/accountsApi`; `useLanguage` from `@scipal/hooks`
- Produces: `ProfileEditModal` — modal component with props `{ isOpen, onClose, currentDisplayName, currentAvatarUrl, onSaved }` where `onSaved()` triggers `router.refresh()`

- [ ] **Step 1: Write failing tests**

Create `frontend/features/profile/ProfileEditModal.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileEditModal } from './ProfileEditModal';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ t: (o: { en: string }) => o.en, lang: 'en' }),
}));
vi.mock('@/features/admin/accountsApi', () => ({
  updateSelfProfile: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe('ProfileEditModal', () => {
  it('does not render when isOpen is false', () => {
    render(<ProfileEditModal isOpen={false} onClose={vi.fn()} currentDisplayName="Alice" currentAvatarUrl={null} onSaved={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders form fields when open', () => {
    render(<ProfileEditModal isOpen={true} onClose={vi.fn()} currentDisplayName="Alice" currentAvatarUrl={null} onSaved={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByDisplayValue('Alice')).toBeTruthy();
  });

  it('shows validation error when display_name is blank on submit', async () => {
    render(<ProfileEditModal isOpen={true} onClose={vi.fn()} currentDisplayName="" currentAvatarUrl={null} onSaved={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/name cannot be blank/i)).toBeTruthy());
  });

  it('calls onSaved after successful submit', async () => {
    const onSaved = vi.fn();
    render(<ProfileEditModal isOpen={true} onClose={vi.fn()} currentDisplayName="Alice" currentAvatarUrl={null} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run tests to confirm RED**

```powershell
pnpm --filter @scipal/web test -- --reporter=verbose ProfileEditModal
```

Expected: FAIL — `ProfileEditModal` not found.

- [ ] **Step 3: Implement `frontend/features/profile/ProfileEditModal.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { updateSelfProfile } from '@/features/admin/accountsApi';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDisplayName: string | null | undefined;
  currentAvatarUrl: string | null | undefined;
  onSaved: () => void;
}

export function ProfileEditModal({ isOpen, onClose, currentDisplayName, currentAvatarUrl, onSaved }: ProfileEditModalProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(currentDisplayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError(t({ en: 'Name cannot be blank', vi: 'Tên không được để trống' }));
      return;
    }

    setSaving(true);
    try {
      await updateSelfProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
      });
      onSaved();
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? t({ en: 'Failed to save', vi: 'Không thể lưu thay đổi' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t({ en: 'Edit Profile', vi: 'Chỉnh sửa hồ sơ' })}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl dark:bg-card p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {t({ en: 'Edit Profile', vi: 'Chỉnh sửa hồ sơ' })}
        </h2>

        <form className="mt-4 space-y-4" onSubmit={handleSave} noValidate>
          <div>
            <label htmlFor="edit-display-name" className="block mb-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t({ en: 'Display Name', vi: 'Tên hiển thị' })}
            </label>
            <input
              id="edit-display-name"
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError(null); }}
              disabled={saving}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-xs transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="edit-avatar-url" className="block mb-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t({ en: 'Avatar URL', vi: 'Đường dẫn ảnh đại diện' })}
            </label>
            <input
              id="edit-avatar-url"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              disabled={saving}
              placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-xs transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="mt-2 h-12 w-12 rounded-full object-cover border border-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition dark:border-white/10 dark:text-gray-300"
            >
              {t({ en: 'Cancel', vi: 'Hủy' })}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {saving ? t({ en: 'Saving…', vi: 'Đang lưu…' }) : t({ en: 'Save', vi: 'Lưu' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add "Edit Profile" button to `AccountSettings.tsx`**

In `frontend/features/profile/AccountSettings.tsx`, add to imports at the top:

```typescript
import { ProfileEditModal } from './ProfileEditModal';
```

Add state after existing `showHelpModal` state:

```typescript
const [showEditModal, setShowEditModal] = useState(false);
```

Add the button in the "Support and Assistance" section (after the existing `Institutional Support` button row, before the `</div>` closing the `space-y-5` div), replacing the existing help row's wrapping div to add the edit button:

Inside the `<div className="space-y-5">` block, add a new row before the support footer:

```tsx
{/* Edit Profile */}
<div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
  <div>
    <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
      <span>✏️</span>
      <span>{t({ en: 'Display Name & Avatar', vi: 'Tên hiển thị & Ảnh đại diện' })}</span>
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400">
      {t({ en: 'Change your public profile information', vi: 'Thay đổi thông tin hồ sơ công khai' })}
    </div>
  </div>
  <button
    type="button"
    onClick={() => setShowEditModal(true)}
    className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
  >
    {t({ en: 'Edit', vi: 'Chỉnh sửa' })}
  </button>
</div>
```

After the closing `</>` of the `AccountHelpModal`, add:

```tsx
<ProfileEditModal
  isOpen={showEditModal}
  onClose={() => setShowEditModal(false)}
  currentDisplayName={undefined}
  currentAvatarUrl={undefined}
  onSaved={() => setShowEditModal(false)}
/>
```

- [ ] **Step 5: Run tests to confirm GREEN**

```powershell
pnpm --filter @scipal/web test -- --reporter=verbose ProfileEditModal
```

Expected: all 4 ProfileEditModal tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/features/profile/ProfileEditModal.tsx frontend/features/profile/ProfileEditModal.test.tsx frontend/features/profile/AccountSettings.tsx
git commit -m "feat(accounts): add ProfileEditModal and self-service profile edit in AccountSettings"
```

---

## Task 6: NavBar admin link + final build verification

**Files:**
- Modify: `frontend/components/nav/NavBar.tsx`

**Interfaces:**
- Consumes: Supabase session (via `createBrowserClient()` in a client hook, or passed from layout as a server prop)
- Produces: NavBar conditionally renders "Admin" link when `app_role === 'admin'`

- [ ] **Step 1: Add `useAdminRole` hook and admin link to NavBar**

In `NavBar.tsx`, add after the `useLanguage` and `usePathname` hooks:

```typescript
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
```

Inside `NavBar` function body, after `const pathname = usePathname();`:

```typescript
const [isAdmin, setIsAdmin] = useState(false);
useEffect(() => {
  const supabase = createBrowserClient();
  void supabase.auth.getSession().then(({ data: { session } }) => {
    const role = (session?.user?.app_metadata as any)?.app_role;
    setIsAdmin(role === 'admin');
  });
}, []);
```

Inside the `<nav>` element, after the `/profile` link:

```tsx
{isAdmin && (
  <Link
    href="/admin/accounts"
    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 transition hidden md:block"
  >
    {lang === 'en' ? 'Admin' : 'Quản trị'}
  </Link>
)}
```

- [ ] **Step 2: Run full typecheck**

```powershell
pnpm typecheck
```

Expected: 0 errors across all 7 packages.

- [ ] **Step 3: Run all tests**

```powershell
pnpm test
```

Expected: all tests pass (previous 43 + new tests from Tasks 1, 3, 4, 5).

- [ ] **Step 4: Build frontend**

```powershell
pnpm --filter @scipal/web build
```

Expected: build succeeds with `frontend/app/admin/accounts` route visible in output.

- [ ] **Step 5: Commit NavBar change**

```powershell
git add frontend/components/nav/NavBar.tsx
git commit -m "feat(accounts): show Admin nav link for app_role=admin users"
```

- [ ] **Step 6: Update `PROJECT_STATE.md`**

In `PROJECT_STATE.md`, add to the **Completed** section:

```markdown
### 4. Account Management System (NEW):
- Admin Dashboard `/admin/accounts` — list/create/change-role/delete accounts, protected by `RequireAdmin`.
- Backend: `GET/POST/PATCH/DELETE /api/auth/accounts` + `PATCH /api/auth/profile` in Fastify with `verifyAdmin` preHandler.
- `app_role` stored in `auth.users.app_metadata` — only writable via `SUPABASE_SERVICE_ROLE_KEY`.
- Self-service `ProfileEditModal` accessible from `/profile` → AccountSettings.
- `backend/scripts/seed-admin.ts` — CLI script to grant initial admin role.
```

Update **Next Steps** section, replacing the current item 1:

```markdown
1. Run `pnpm --filter @scipal/api tsx scripts/seed-admin.ts <your-email>` to grant yourself admin access.
```

- [ ] **Step 7: Final commit**

```powershell
git add PROJECT_STATE.md
git commit -m "docs: update PROJECT_STATE with account management completion"
```
