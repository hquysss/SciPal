import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { surveyRoutes } from '../routes/survey.js';
import { authPlugin } from '../plugins/auth.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';
const ID = '00000000-0000-4000-8000-000000000031';
const input = { submission_id: ID, rating: 4, usability: 'easy', feedback: '  Dễ dùng  ' };
const summary = { total: 21, average: 4.24, distribution: [1, 1, 2, 5, 12] };
const apps: ReturnType<typeof Fastify>[] = [];
beforeEach(() => { vi.stubEnv('GUEST_TRIAL_SECRET', 'website-feedback-test-secret-at-least-32-chars'); });
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(apps.splice(0).map(a => a.close())); });
async function appFor(queries?: MockBuilder[], stats = mockQuery({ data: summary, error: null }), userId?: string, role = 'student', profiles = mockQuery({ data: [], error: null })) {
  const app = Fastify(); apps.push(app);
  if (queries) app.decorate('supabase', mockSupabase({ surveys: queries, 'rpc:website_feedback_summary': stats, profiles }));
  if (!userId) await app.register(authPlugin);
  if (userId) app.addHook('onRequest', async (request) => { (request as typeof request & { user: { id: string; app_metadata: { app_role: string } } }).user = { id: userId, app_metadata: { app_role: role } }; });
  await app.register(surveyRoutes); await app.ready(); return app;
}
const ok = () => mockQuery({ data: null, error: null });
const count = (n = 0) => mockQuery({ data: null, error: null, count: n });
const send = (app: Awaited<ReturnType<typeof appFor>>, payload: unknown = input) => app.inject({ method: 'POST', url: '/api/survey', payload: { type: 'website_feedback', payload } });
describe('website feedback', () => {
  it('saves an anonymous review with a trimmed comment and no raw address', async () => {
    const insert = ok(); const app = await appFor([ok(), count(), insert]);
    const response = await send(app); expect(response.statusCode).toBe(201);
    expect(insert.inserted).toEqual([{ id: ID, user_id: null, type: 'website_feedback', payload: { rating: 4, usability: 'easy', feedback: 'Dễ dùng', visitor_hash: expect.any(String) } }]);
    expect(JSON.stringify(insert.inserted)).not.toContain('127.0.0.1');
  });
  it('takes the account id from the verified request', async () => {
    const insert = ok(); const app = await appFor([ok(), count(), insert], undefined, 'verified-student');
    expect((await send(app)).statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({ user_id: 'verified-student' });
  });
  it.each([{ ...input, rating: 0 }, { ...input, rating: 6 }, { ...input, rating: 2.5 }, { ...input, usability: 'excellent' }, { ...input, feedback: 'a'.repeat(501) }, { ...input, user_id: 'forged' }, { ...input, submission_id: 'bad' }])('rejects malformed feedback before writing: %j', async payload => {
    const insert = ok(); const app = await appFor([insert]); expect((await send(app, payload)).statusCode).toBe(400); expect(insert.inserted).toHaveLength(0);
  });
  it('accepts an empty optional comment', async () => {
    const insert = ok(); const app = await appFor([ok(), count(), insert]); expect((await send(app, { ...input, feedback: '' })).statusCode).toBe(201);
  });
  it('does not count or write a successful submission twice', async () => {
    const existing = mockQuery({ data: { payload: { rating: 4, usability: 'easy', feedback: 'Dễ dùng' } }, error: null });
    const app = await appFor([existing]); expect((await send(app)).statusCode).toBe(201); expect(existing.inserted).toHaveLength(0);
  });
  it('rejects reusing a submission id for different content', async () => {
    const app = await appFor([mockQuery({ data: { payload: { rating: 1, usability: 'hard', feedback: '' } }, error: null })]); expect((await send(app)).statusCode).toBe(409);
  });
  it('handles a duplicate-key race without adding another review', async () => {
    const insert = mockQuery({ data: null, error: { code: '23505', message: 'duplicate' } });
    const existing = mockQuery({ data: { payload: { rating: 4, usability: 'easy', feedback: 'Dễ dùng' } }, error: null });
    const app = await appFor([ok(), count(), insert, existing]); expect((await send(app)).statusCode).toBe(201); expect(insert.inserted).toHaveLength(1);
  });
  it('limits repeated new submissions', async () => {
    const insert = ok(); const app = await appFor([ok(), count(10), insert]); expect((await send(app)).statusCode).toBe(429); expect(insert.inserted).toHaveLength(0);
  });
  it('serves a paginated anonymous projection and the database-wide mean', async () => {
    const list = mockQuery({ data: [{ id: ID, user_id: 'private-account', payload: { rating: 5, usability: 'easy', feedback: 'Great', visitor_hash: 'private-hash' }, created_at: '2026-10-06T00:00:00Z' }], error: null });
    const app = await appFor([list]); const response = await app.inject('/api/survey/website?page=2&identities=true');
    expect(response.statusCode).toBe(200); expect(response.json()).toMatchObject({ ...summary, page: 2, page_size: 10, reviews: [{ id: ID, rating: 5, usability: 'easy', feedback: 'Great' }] });
    expect(response.body).not.toContain('private-account'); expect(response.body).not.toContain('private-hash');
    expect(list.eqCalls).toContainEqual(['type', 'website_feedback']); expect(list.rangeCalls).toEqual([[10, 19]]);
  });
  it('reports no average while the site has no reviews', async () => {
    const app = await appFor([mockQuery({ data: [], error: null })], mockQuery({ data: { total: 0, average: null, distribution: [0, 0, 0, 0, 0] }, error: null }));
    expect((await app.inject('/api/survey/website')).json()).toMatchObject({ total: 0, average: null, reviews: [] });
  });
  it('does not turn a storage error into a fake successful save', async () => {
    const app = await appFor([ok(), count(), mockQuery({ data: null, error: { code: 'XX000', message: 'failed' } })]); expect((await send(app)).statusCode).toBe(503);
  });
  it('returns unavailable when aggregate storage fails', async () => {
    const app = await appFor([mockQuery({ data: [], error: null })], mockQuery({ data: null, error: { code: 'XX000', message: 'failed' } })); expect((await app.inject('/api/survey/website')).statusCode).toBe(503);
  });
  it('keeps identities behind an admin-only endpoint', async () => {
    const guest = await appFor([ok()]); expect((await guest.inject('/api/admin/website-feedback')).statusCode).toBe(401);
  });
  it('blocks a non-admin account from seeing identity', async () => {
    const app = await appFor([ok()], undefined, ID, 'student'); expect((await app.inject('/api/admin/website-feedback')).statusCode).toBe(403);
  });
  it('lets only the admin projection resolve an account identity', async () => {
    const list = mockQuery({ data: [{ id: ID, user_id: ID, payload: { rating: 4, usability: 'easy', feedback: '' }, created_at: '2026-10-06T00:00:00Z' }], error: null });
    const profiles = mockQuery({ data: [{ id: ID, display_name: 'Private Person' }], error: null });
    const app = await appFor([list], undefined, ID, 'admin', profiles);
    const response = await app.inject('/api/admin/website-feedback'); expect(response.statusCode).toBe(200); expect(response.json().reviews[0].sender).toEqual({ id: ID, name: 'Private Person' });
  });

  it('supports guests without depending on guest-trial configuration', async () => {
    vi.stubEnv('GUEST_TRIAL_SECRET', ''); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'isolated-test-backend-secret-not-a-real-credential');
    const insert = ok(); const app = await appFor([ok(), count(), insert]); expect((await send(app)).statusCode).toBe(201);
  });

});
