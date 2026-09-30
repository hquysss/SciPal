import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { tutorRoutes } from '../routes/tutor.js';
import { createVoiceToken, LIVE_SOCKET_URL, VoiceTokenError } from '../tutor/voiceToken.js';
import { buildSystemPrompt } from '../tutor/systemPrompt.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const student = { id: 'student-1', app_metadata: {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const reservation = (remaining: number) =>
  ok({ operation_id: 'd0000000-0000-4000-8000-000000000001', state: 'reserved', kind: 'monthly', remaining, resets_at: '2026-10-31T17:00:00+00:00' });
const names = () => rpcCalls.map(([name, args]) => [name, (args as { p_outcome?: string }).p_outcome].filter(Boolean).join(':'));

const tokenReply = (status = 200, body: unknown = { name: 'auth_tokens/abc' }) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

async function build(tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.decorate('aiProvider', { chat: async function* () {} });
  app.addHook('onRequest', async (req) => { (req as any).user = student; });
  await app.register(tutorRoutes);
  await app.ready();
  return app;
}

beforeEach(() => {
  rpcCalls.length = 0;
  process.env.GEMINI_API_KEY = 'server-key';
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEMINI_API_KEY;
});

describe('voice token', () => {
  it('asks for a one-use token locked to the model, the instruction and spoken answers', async () => {
    const fetchImpl = tokenReply();
    const now = new Date('2026-10-01T00:00:00Z');
    const voice = await createVoiceToken({ apiKey: 'k', model: 'gemini-3.8-live', systemInstruction: 'Be a tutor', language: 'vi', now }, fetchImpl as never);
    expect(voice).toEqual({ token: 'auth_tokens/abc', model: 'gemini-3.8-live', socketUrl: LIVE_SOCKET_URL, expiresAt: '2026-10-01T00:11:00.000Z', maxSeconds: 600 });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('k');
    const sent = JSON.parse(String(init.body));
    expect(sent).toMatchObject({
      uses: 1,
      bidiGenerateContentSetup: {
        model: 'models/gemini-3.8-live',
        generationConfig: { responseModalities: ['AUDIO'] },
        systemInstruction: { parts: [{ text: 'Be a tutor' }] },
        inputAudioTranscription: {},
      },
    });
  });

  it('fails clearly when the service refuses', async () => {
    await expect(createVoiceToken({ apiKey: 'k', model: 'm', systemInstruction: 's', language: 'en' }, tokenReply(403, { error: 'no' }) as never)).rejects.toBeInstanceOf(VoiceTokenError);
  });

  it('the spoken prompt asks for short turns and no markdown', () => {
    const spoken = buildSystemPrompt({ language: 'vi', level: null, spoken: true });
    expect(spoken).toContain('spoken conversation');
    expect(spoken).not.toContain('Format with markdown');
  });
});

describe('POST /api/tutor/voice', () => {
  it('counts one tutor request and hands back the token, never the key', async () => {
    vi.stubGlobal('fetch', tokenReply());
    const app = await build({ profiles: ok(null), 'rpc:billing_reserve_quota': reservation(9), 'rpc:billing_settle_quota': ok(true) });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/voice', payload: { language: 'vi' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ token: 'auth_tokens/abc', remaining: 9, period: 'month' });
    expect(res.body).not.toContain('server-key');
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:commit']);
    await app.close();
  });

  it('gives the request back when no token could be made', async () => {
    vi.stubGlobal('fetch', tokenReply(500, {}));
    const app = await build({ profiles: ok(null), 'rpc:billing_reserve_quota': reservation(9), 'rpc:billing_settle_quota': ok(true) });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/voice', payload: {} });
    expect(res.statusCode).toBe(502);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:release']);
    await app.close();
  });

  it('says voice is not set up without a Gemini key', async () => {
    delete process.env.GEMINI_API_KEY;
    const app = await build({ profiles: ok(null) });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/voice', payload: {} });
    expect(res.statusCode).toBe(503);
    expect(res.json().code).toBe('VOICE_UNAVAILABLE');
    await app.close();
  });
});
