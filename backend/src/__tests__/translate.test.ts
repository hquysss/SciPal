import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { translateRoutes } from '../routes/translate.js';
import { isCopyThrough, parseTranslations } from '../translate/translatePrompt.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const student = { id: 'student-1', app_metadata: {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });

function provider(replies: Array<string | Error>) {
  const calls: Array<{ messages: Array<{ content: string }>; system: string; choice: unknown }> = [];
  return {
    calls,
    chat: async function* (messages: Array<{ content: string }>, system: string, choice: unknown) {
      calls.push({ messages, system, choice });
      const next = replies.shift() ?? '[]';
      if (next instanceof Error) throw next;
      yield next;
    },
  };
}

async function build(opts: { user?: unknown; tables?: Record<string, MockBuilder | MockBuilder[]>; ai?: ReturnType<typeof provider>; translate?: { enabled: boolean; dailyChars: number } } = {}) {
  const ai = opts.ai ?? provider(['["Loops"]']);
  const app = Fastify();
  app.decorate('supabase', mockSupabase(opts.tables ?? { translation_usage: ok(null), 'rpc:add_translation_usage': ok(10) }));
  app.decorate('aiProvider', ai);
  app.decorate('tutorSettings', { get: async () => ({ provider: 'gemini' as const, model: 'gemini-3.8-flash', dailyLimit: 30, enabled: true }), translate: async () => opts.translate ?? { enabled: true, dailyChars: 200_000 }, invalidate: () => {} });
  app.addHook('onRequest', async (req) => { (req as any).user = opts.user ?? teacher; });
  await app.register(translateRoutes);
  await app.ready();
  return { app, ai };
}

const post = (app: Awaited<ReturnType<typeof build>>['app'], payload: object) =>
  app.inject({ method: 'POST', url: '/api/authoring/translate', payload: payload as Record<string, unknown> });

beforeEach(() => { rpcCalls.length = 0; });

describe('translatePrompt', () => {
  it('copies numbers, formulas, code and blanks', () => {
    for (const t of ['42', ' 3,5 ', '12%', '$x^2$', '$$\\int x$$', '```py\nprint(1)\n```', '  ']) expect(isCopyThrough(t)).toBe(true);
    for (const t of ['Vòng lặp', 'Giá trị $x$ là 2']) expect(isCopyThrough(t)).toBe(false);
  });

  it('reads the JSON array even with prose around it, and refuses the wrong length', () => {
    expect(parseTranslations('Here:\n["a","b"]\nDone', 2)).toEqual(['a', 'b']);
    expect(parseTranslations('["a"]', 2)).toBeNull();
    expect(parseTranslations('not json', 1)).toBeNull();
    expect(parseTranslations('[1]', 1)).toBeNull();
  });
});

describe('POST /api/authoring/translate', () => {
  it('translates in order, keeping the provider choice', async () => {
    const { app, ai } = await build({ ai: provider(['["Loops","A **for** loop $i$"]']) });
    const res = await post(app, { from: 'vi', to: 'en', texts: ['Vòng lặp', 'Vòng **for** $i$'] });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ texts: ['Loops', 'A **for** loop $i$'] });
    expect(ai.calls[0].choice).toEqual({ provider: 'gemini', model: 'gemini-3.8-flash' });
    expect(JSON.parse(ai.calls[0].messages[0].content)).toEqual(['Vòng lặp', 'Vòng **for** $i$']);
    expect(rpcCalls[0]).toEqual(['add_translation_usage', expect.objectContaining({ p_user: 'teacher-1', p_chars: 'Vòng lặp'.length + 'Vòng **for** $i$'.length })]);
    await app.close();
  });

  it('copies numbers, formulas and code without calling the model', async () => {
    const code = '```py\nprint(1)\n```';
    const { app, ai } = await build({ ai: provider(['["Loops"]']) });
    const res = await post(app, { from: 'vi', to: 'en', texts: ['42', '$x^2$', code, 'Vòng lặp'] });
    expect(res.json()).toEqual({ texts: ['42', '$x^2$', code, 'Loops'] });
    expect(JSON.parse(ai.calls[0].messages[0].content)).toEqual(['Vòng lặp']);

    const only = await build({ ai: provider([]) });
    const copied = await post(only.app, { from: 'vi', to: 'en', texts: ['42'] });
    expect(copied.json()).toEqual({ texts: ['42'] });
    expect(only.ai.calls).toHaveLength(0);
    await app.close();
    await only.app.close();
  });

  it('retries once on a wrong-length reply, then 502', async () => {
    const bad = await build({ ai: provider(['["one"]', '["one"]']) });
    const res = await post(bad.app, { from: 'vi', to: 'en', texts: ['Một', 'Hai'] });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toEqual({ error: 'Chưa dịch được lúc này. Thử lại sau.', error_en: 'Could not translate right now. Try again later.' });
    expect(bad.ai.calls).toHaveLength(2);
    expect(rpcCalls).toHaveLength(0);

    const second = await build({ ai: provider(['["one"]', '["One","Two"]']) });
    const good = await post(second.app, { from: 'vi', to: 'en', texts: ['Một', 'Hai'] });
    expect(good.statusCode).toBe(200);
    expect(good.json()).toEqual({ texts: ['One', 'Two'] });
    await bad.app.close();
    await second.app.close();
  });

  it('refuses students, bad bodies and oversize requests', async () => {
    const s = await build({ user: student });
    const refused = await post(s.app, { from: 'vi', to: 'en', texts: ['a'] });
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toEqual({ error: 'Chỉ giáo viên và admin mới dùng được tự động dịch.', error_en: 'Only teachers and admins can use automatic translation.' });
    await s.app.close();

    const { app, ai } = await build();
    const bodies = [
      { from: 'vi', to: 'vi', texts: ['a'] },
      { from: 'vi', to: 'fr', texts: ['a'] },
      { from: 'vi', to: 'en', texts: [] },
      { from: 'vi', to: 'en', texts: Array(41).fill('a') },
      { from: 'vi', to: 'en', texts: ['a'.repeat(8001)] },
      { from: 'vi', to: 'en', texts: ['a'.repeat(8000), 'a'.repeat(8000), 'a'.repeat(4001)] },
      { from: 'vi', to: 'en', texts: [7] },
    ];
    for (const body of bodies) {
      const res = await post(app, body);
      expect(res.statusCode).toBe(400);
      expect(res.json().error_en).toEqual(expect.any(String));
    }
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('stops at the daily character budget', async () => {
    const usage = ok({ chars: 199_990 });
    const { app, ai } = await build({ tables: { translation_usage: usage } });
    const res = await post(app, { from: 'vi', to: 'en', texts: ['a'.repeat(20)] });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: 'Hôm nay thầy/cô đã dùng hết lượt dịch tự động. Mai dùng tiếp được.', error_en: 'You have used today’s automatic translation. It resets tomorrow.' });
    expect(ai.calls).toHaveLength(0);
    expect(usage.eqCalls).toEqual([['user_id', 'teacher-1'], ['day', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)]]);
    await app.close();
  });

  it('is off when the admin switched it off', async () => {
    const { app, ai } = await build({ translate: { enabled: false, dailyChars: 200_000 } });
    const res = await post(app, { from: 'vi', to: 'en', texts: ['Vòng lặp'] });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: 'Admin đã tắt dịch tự động.', error_en: 'An admin has turned automatic translation off.' });
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('uses the admin daily limit', async () => {
    const { app, ai } = await build({ translate: { enabled: true, dailyChars: 1000 }, tables: { translation_usage: ok({ chars: 995 }) } });
    expect((await post(app, { from: 'vi', to: 'en', texts: ['Vòng lặp'] })).statusCode).toBe(429);
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('answers 502 with a bilingual message when the provider fails', async () => {
    const { app } = await build({ ai: provider([new Error('429 quota'), new Error('429 quota')]) });
    const res = await post(app, { from: 'vi', to: 'en', texts: ['Vòng lặp'] });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toEqual({ error: 'Chưa dịch được lúc này. Thử lại sau.', error_en: 'Could not translate right now. Try again later.' });
    await app.close();
  });
});
