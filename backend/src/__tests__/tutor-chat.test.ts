import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { tutorRoutes } from '../routes/tutor.js';
import { mockQuery, mockSupabase as rawSupabase, type MockBuilder } from './helpers/supabaseMock.js';

/** The quota ledger answers "plenty left" unless a test sets its own rpc results. */
const quota = (remaining = 99, kind = 'daily') =>
  mockQuery({ data: { operation_id: 'd0000000-0000-4000-8000-000000000001', state: 'reserved', kind, remaining, resets_at: '2026-09-28T17:00:00+00:00' }, error: null });
const mockSupabase = (tables: Record<string, MockBuilder | MockBuilder[]>) =>
  rawSupabase({ 'rpc:billing_reserve_quota': quota(), 'rpc:billing_settle_quota': mockQuery({ data: true, error: null }), ...tables });

const C1 = 'c0000000-0000-4000-8000-000000000001';
const L1 = 'b0000000-0000-4000-8000-000000000001';
const student = { id: 'student-1', app_metadata: {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });

function provider(chunks: string[], failAfter?: number) {
  const calls: Array<{ messages: unknown[]; system: string }> = [];
  return {
    calls,
    chat: async function* (messages: unknown[], system: string) {
      calls.push({ messages, system });
      for (const [i, c] of chunks.entries()) {
        if (failAfter !== undefined && i === failAfter) throw new Error('provider down');
        yield c;
      }
    },
  };
}

async function build(tables: Record<string, MockBuilder | MockBuilder[]>, ai = provider(['Gợi ý ', 'một bước.'])) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.decorate('aiProvider', ai);
  app.addHook('onRequest', async (req) => { (req as any).user = student; });
  await app.register(tutorRoutes);
  await app.ready();
  return { app, ai };
}

const events = (body: string) =>
  body.trim().split('\n\n').map((block) => {
    const [ev, data] = block.split('\n');
    return { event: ev.replace('event: ', ''), data: JSON.parse(data.replace('data: ', '')) };
  });

describe('POST /api/tutor/chat', () => {
  it('refuses empty and too long messages', async () => {
    const { app } = await build({});
    for (const message of ['   ', 'a'.repeat(2001)]) {
      expect((await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message, language: 'vi' } })).statusCode).toBe(400);
    }
    await app.close();
  });

  it('answers 429 at the daily limit, counting from the Vietnam day start', async () => {
    const count = mockQuery({ data: null, error: null, count: 30 });
    const { app } = await build({ tutor_messages: count });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Hỏi', language: 'vi' } });
    expect(res.statusCode).toBe(429);
    expect(res.json().remaining).toBe(0);
    expect(count.eqCalls).toEqual(expect.arrayContaining([['user_id', 'student-1'], ['role', 'user']]));
    expect(count.gteCalls[0][0]).toBe('created_at');
    await app.close();
  });

  it('creates a conversation, stores both messages and streams meta, deltas, done', async () => {
    const convInsert = ok({ id: C1 });
    const userInsert = ok();
    const assistantInsert = ok();
    const { app, ai } = await build({
      tutor_messages: [mockQuery({ data: null, error: null, count: 3 }), userInsert, ok([{ role: 'user', content: 'Vòng lặp là gì?' }]), assistantInsert],
      profiles: ok({ preferred_education_level: 'lower_secondary' }),
      tutor_conversations: [convInsert, ok()],
    });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: '  Vòng lặp là gì?  ', language: 'vi' } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    const ev = events(res.body);
    expect(ev.map((e) => e.event)).toEqual(['meta', 'delta', 'delta', 'done']);
    expect(ev[0].data).toEqual({ conversation_id: C1, remaining: 26 , period: 'day' });
    expect(convInsert.inserted[0]).toMatchObject({ user_id: 'student-1', title: 'Vòng lặp là gì?', lesson_id: null });
    expect(userInsert.inserted[0]).toMatchObject({ conversation_id: C1, role: 'user', content: 'Vòng lặp là gì?' });
    expect(assistantInsert.inserted[0]).toMatchObject({ role: 'assistant', content: 'Gợi ý một bước.' });
    expect(ai.calls[0].system).toMatch(/lower secondary/i);
    expect(ai.calls[0].system).toContain('"thầy"');
    await app.close();
  });

  it('404s a conversation that is not the caller’s', async () => {
    const { app } = await build({
      tutor_messages: mockQuery({ data: null, error: null, count: 0 }),
      tutor_conversations: ok(null),
    });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { conversation_id: C1, message: 'Hỏi', language: 'vi' } });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('refuses a draft lesson, and never sends quiz answers to the model', async () => {
    const draft = await build({
      tutor_messages: mockQuery({ data: null, error: null, count: 0 }),
      lessons: ok({ title_vi: 'B', title_en: 'B', status: 'draft', blocks: [], subjects: { name_vi: 'Tin học', name_en: 'Informatics' } }),
    });
    expect((await draft.app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { lesson_id: L1, message: 'Hỏi', language: 'vi' } })).statusCode).toBe(404);
    await draft.app.close();

    const { app, ai } = await build({
      tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), ok(), ok([{ role: 'user', content: 'Hỏi' }]), ok()],
      lessons: ok({
        title_vi: 'Vòng lặp', title_en: 'Loops', status: 'published', subjects: { name_vi: 'Tin học', name_en: 'Informatics' },
        blocks: [{ type: 'theory', content: { vi: 'Lý thuyết vòng lặp', en: 'x' } }, { type: 'quiz', question_id: L1, answer_key: 'SECRET' }],
      }),
      profiles: ok(null),
      tutor_conversations: [ok({ id: C1 }), ok()],
    });
    await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { lesson_id: L1, message: 'Hỏi', language: 'vi' } });
    expect(ai.calls[0].system).toContain('Lý thuyết vòng lặp');
    expect(ai.calls[0].system).not.toContain('SECRET');
    await app.close();
  });

  it('stores the partial answer and sends an error event when the provider fails after some text', async () => {
    const assistantInsert = ok();
    const { app } = await build(
      {
        tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), ok(), ok([{ role: 'user', content: 'Hỏi' }]), assistantInsert],
        profiles: ok(null),
        tutor_conversations: [ok({ id: C1 }), ok()],
      },
      provider(['Bước 1. ', 'never'], 1),
    );
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Hỏi', language: 'vi' } });
    const ev = events(res.body);
    expect(ev.map((e) => e.event)).toEqual(['meta', 'delta', 'error']);
    expect(assistantInsert.inserted[0]).toMatchObject({ content: 'Bước 1. ' });
    await app.close();
  });

  it('gives the question back when the model fails before any text: no answer, no lost question, empty new chat removed', async () => {
    const userInsert = ok({ id: 'q1' });
    const questionDelete = ok();
    const conversationDelete = ok();
    const { app } = await build(
      {
        tutor_messages: [mockQuery({ data: null, error: null, count: 3 }), userInsert, ok([{ role: 'user', content: 'Hỏi' }]), questionDelete],
        profiles: ok(null),
        tutor_conversations: [ok({ id: C1 }), conversationDelete],
      },
      provider(['x'], 0),
    );
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Hỏi', language: 'vi' } });
    const ev = events(res.body);
    expect(ev.map((e) => e.event)).toEqual(['meta', 'error']);
    expect(ev[0].data.remaining).toBe(26);
    expect(ev[1].data).toMatchObject({ remaining: 27, conversation_removed: true });
    expect(ev[1].data.error).toMatch(/không bị tính lượt/);
    expect(questionDelete.deleteCalls).toBe(1);
    expect(questionDelete.eqCalls).toContainEqual(['id', 'q1']);
    expect(conversationDelete.deleteCalls).toBe(1);
    expect(conversationDelete.eqCalls).toContainEqual(['id', C1]);
    await app.close();
  });

  it('keeps an existing conversation and says the tutor is overloaded on a provider 429', async () => {
    const questionDelete = ok();
    const overloaded = {
      calls: [] as unknown[],
      chat: async function* () {
        throw Object.assign(new Error('429 status code (no body)'), { status: 429 });
      },
    };
    const { app } = await build(
      {
        tutor_conversations: ok({ id: C1, lesson_id: null }),
        tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), ok({ id: 'q2' }), ok([{ role: 'user', content: 'Hỏi' }]), questionDelete],
        profiles: ok(null),
      },
      overloaded as never,
    );
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { conversation_id: C1, message: 'Hỏi', language: 'vi' } });
    const error = events(res.body)[1].data;
    expect(error.error).toMatch(/quá tải/);
    expect(error.error_en).toMatch(/overloaded/i);
    expect(error).toMatchObject({ remaining: 30, conversation_removed: false });
    expect(questionDelete.eqCalls).toContainEqual(['id', 'q2']);
    await app.close();
  });

  it('stops asking the model and stores the partial answer when the student disconnects', async () => {
    const assistantInsert = ok();
    let captured: { raw: { destroy(): void } } | null = null;
    let pulledAfterClose = false;
    const ai = {
      calls: [] as unknown[],
      chat: async function* () {
        yield 'Bước 1. ';
        captured!.raw.destroy();
        await new Promise((r) => setTimeout(r, 5));
        yield 'late';
        pulledAfterClose = true;
        yield 'never';
      },
    };
    const app = Fastify();
    app.decorate('supabase', mockSupabase({
      tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), ok(), ok([{ role: 'user', content: 'Hỏi' }]), assistantInsert],
      profiles: ok(null),
      tutor_conversations: [ok({ id: C1 }), ok()],
    }));
    app.decorate('aiProvider', ai);
    app.addHook('onRequest', async (req) => { (req as any).user = student; });
    app.addHook('preHandler', async (_req, reply) => { captured = reply as any; });
    await app.register(tutorRoutes);
    await app.ready();
    await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Hỏi', language: 'vi' } }).catch(() => null);
    await new Promise((r) => setTimeout(r, 30));
    expect(assistantInsert.inserted[0]).toMatchObject({ content: 'Bước 1. ' });
    expect(pulledAfterClose).toBe(false);
    await app.close();
  });

  it('retrying the unanswered last question neither stores nor counts it again', async () => {
    const last = ok({ role: 'user', content: 'Hỏi' });
    const count = mockQuery({ data: null, error: null, count: 30 });
    const history = ok([{ role: 'user', content: 'Hỏi' }]);
    const assistantInsert = ok();
    const { app } = await build({
      tutor_conversations: [ok({ id: C1, lesson_id: null }), ok()],
      tutor_messages: [last, count, history, assistantInsert],
      profiles: ok(null),
    });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { conversation_id: C1, message: 'Hỏi', language: 'vi', retry: true } });
    expect(res.statusCode).toBe(200);
    expect(events(res.body)[0].data).toEqual({ conversation_id: C1, remaining: 0 , period: 'day' });
    expect(history.inserted).toEqual([]);
    expect(assistantInsert.inserted[0]).toMatchObject({ role: 'assistant', content: 'Gợi ý một bước.' });
    await app.close();
  });

  it('keeps an old conversation going without lesson text when its lesson is no longer published', async () => {
    const { app, ai } = await build({
      tutor_conversations: [ok({ id: C1, lesson_id: L1 }), ok()],
      tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), ok(), ok([{ role: 'user', content: 'Hỏi' }]), ok()],
      lessons: ok({ title_vi: 'Bài nháp', title_en: 'Draft', status: 'draft', blocks: [{ type: 'theory', content: { vi: 'NỘI DUNG NHÁP', en: 'x' } }], subjects: null }),
      profiles: ok(null),
    });
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { conversation_id: C1, message: 'Hỏi', language: 'vi' } });
    expect(res.statusCode).toBe(200);
    expect(ai.calls[0].system).not.toContain('NỘI DUNG NHÁP');
    await app.close();
  });

  it('sends the model a history that starts with the student', async () => {
    const { app, ai } = await build({
      tutor_messages: [
        mockQuery({ data: null, error: null, count: 0 }),
        ok(),
        ok([{ role: 'user', content: 'Q3' }, { role: 'assistant', content: 'A2' }, { role: 'user', content: 'Q2' }, { role: 'assistant', content: 'A1' }]),
        ok(),
      ],
      tutor_conversations: [ok({ id: C1, lesson_id: null }), ok()],
      profiles: ok(null),
    });
    await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { conversation_id: C1, message: 'Q3', language: 'vi' } });
    expect((ai.calls[0].messages as Array<{ role: string; content: string }>).map((m) => m.content)).toEqual(['Q2', 'A2', 'Q3']);
    await app.close();
  });

  it('follows the admin settings: off answers 503, the limit and the model come from them', async () => {
    const settings = (value: object) => ({ get: async () => ({ provider: 'openai' as const, model: 'admin-model', dailyLimit: 5, enabled: true, ...value }), invalidate() {} });

    const offApp = Fastify();
    offApp.decorate('supabase', mockSupabase({}));
    offApp.decorate('aiProvider', provider([]));
    offApp.decorate('tutorSettings', settings({ enabled: false }));
    offApp.addHook('onRequest', async (req) => { (req as any).user = student; });
    await offApp.register(tutorRoutes);
    const offRes = await offApp.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Hỏi', language: 'vi' } });
    expect(offRes.statusCode).toBe(503);
    expect(offRes.json().error).toMatch(/tạm nghỉ/);
    await offApp.close();

    const limited = Fastify();
    limited.decorate('supabase', mockSupabase({ tutor_messages: mockQuery({ data: null, error: null, count: 5 }) }));
    limited.decorate('aiProvider', provider([]));
    limited.decorate('tutorSettings', settings({}));
    limited.addHook('onRequest', async (req) => { (req as any).user = student; });
    await limited.register(tutorRoutes);
    expect((await limited.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Hỏi', language: 'vi' } })).statusCode).toBe(429);
    await limited.close();

    const ai = { choices: [] as unknown[], chat: async function* (_m: unknown, _s: string, choice?: unknown) { ai.choices.push(choice); yield 'ok'; } };
    const app = Fastify();
    app.decorate('supabase', mockSupabase({
      tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), ok(), ok([{ role: 'user', content: 'Hỏi' }]), ok()],
      profiles: ok(null),
      tutor_conversations: [ok({ id: C1 }), ok()],
    }));
    app.decorate('aiProvider', ai);
    app.decorate('tutorSettings', settings({}));
    app.addHook('onRequest', async (req) => { (req as any).user = student; });
    await app.register(tutorRoutes);
    const res = await app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Hỏi', language: 'vi' } });
    expect(events(res.body)[0].data).toEqual({ conversation_id: C1, remaining: 4 , period: 'day' });
    expect(ai.choices[0]).toEqual({ provider: 'openai', model: 'admin-model' });
    await app.close();
  });
});

