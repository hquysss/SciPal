import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { dictionaryRoutes } from '../routes/dictionary.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const LESSON = '22222222-2222-4222-8222-222222222222';
const SUBJECT = '33333333-3333-4333-8333-333333333333';
const OP = '66666666-6666-4666-8666-666666666666';
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const lesson = () => ok({ id: LESSON, subject_id: SUBJECT, subjects: { name_en: 'Informatics', archived_at: null } });
const hold = () => ok({ operation_id: OP, state: 'reserved', kind: 'daily', remaining: 10_000, resets_at: '2026-10-14T17:00:00+00:00' });
const ENTRY = {
  term_en: 'repeat', term_vi: 'lặp lại', ipa: 'rɪˈpiːt', part_of_speech: 'verb',
  definition_en: 'To do something again.', definition_vi: 'Làm lại một việc.', example_en: 'Repeat the step.', example_vi: 'Lặp lại bước đó.',
};
const saved = { id: '44444444-4444-4444-8444-444444444444', ...ENTRY };

function provider(replies: Array<string | Error>) {
  const calls: Array<{ system: string; content: string }> = [];
  return {
    calls,
    chat: async function* (messages: Array<{ content: string }>, system: string, _o: unknown, onUsage?: (u: { prompt: number; completion: number; total: number }) => void) {
      calls.push({ system, content: messages[0]!.content });
      const next = replies.shift() ?? '';
      if (next instanceof Error) throw next;
      yield next;
      onUsage?.({ prompt: 200, completion: 150, total: 350 });
    },
  };
}

async function build(user: object | undefined, tables: Record<string, MockBuilder | MockBuilder[]>, ai = provider([JSON.stringify(ENTRY)])) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.decorate('aiProvider', ai);
  if (user) app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(dictionaryRoutes);
  await app.ready();
  return { app, ai };
}
const lookup = (app: Awaited<ReturnType<typeof build>>['app'], text: string, lesson_id = LESSON) =>
  app.inject({ method: 'POST', url: '/api/dictionary/lookup', payload: { text, lesson_id } });
const names = () => rpcCalls.map(([name, args]) => [name, (args as { p_outcome?: string }).p_outcome].filter(Boolean).join(':'));

beforeEach(() => { rpcCalls.length = 0; });

describe('POST /api/dictionary/lookup', () => {
  it('refuses text that is not 1–5 words of letters, and a bad lesson id', async () => {
    const { app } = await build(student, {});
    expect((await lookup(app, '2 + 2')).statusCode).toBe(400);
    expect((await lookup(app, 'loop', 'nope')).statusCode).toBe(400);
  });

  it('is 404 for a lesson that is not published or whose subject is archived', async () => {
    let { app } = await build(student, { lessons: ok(null) });
    expect((await lookup(app, 'loop')).statusCode).toBe(404);
    ({ app } = await build(student, { lessons: ok({ id: LESSON, subject_id: SUBJECT, subjects: { name_en: 'X', archived_at: '2026-01-01' } }) }));
    expect((await lookup(app, 'loop')).statusCode).toBe(404);
  });

  it('answers a glossary term of the lesson subject first, to visitors too, without asking the AI', async () => {
    const terms = ok([{ id: 't1', kind: 'word', term_en: 'Loop', term_vi: 'Vòng lặp', definition_en: 'd', definition_vi: 'd' }]);
    const { app, ai } = await build(undefined, { lessons: lesson(), terms });
    const res = await lookup(app, 'Vòng lặp,');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ source: 'glossary', term: { id: 't1', term_en: 'Loop' } });
    expect(terms.eqCalls).toEqual(expect.arrayContaining([['subject_id', SUBJECT], ['status', 'published']]));
    expect(terms.ilikeCalls).toEqual([['term_vi', 'vòng lặp']]);
    expect(ai.calls).toHaveLength(0);
  });

  it('answers a kept dictionary entry of the subject next', async () => {
    const entries = ok(saved);
    const { app, ai } = await build(undefined, { lessons: lesson(), terms: ok([]), dictionary_entries: entries });
    const res = await lookup(app, 'Repeat');
    expect(res.json()).toMatchObject({ source: 'dictionary', term: { id: saved.id, term_vi: 'lặp lại', kind: 'word', audio_url: null } });
    expect(entries.eqCalls).toEqual([['subject_id', SUBJECT], ['source_lang', 'en'], ['query', 'repeat']]);
    expect(ai.calls).toHaveLength(0);
  });

  it('a visitor is asked to sign in for a new word', async () => {
    const { app } = await build(undefined, { lessons: lesson(), terms: ok([]), dictionary_entries: ok(null) });
    expect((await lookup(app, 'repeat')).statusCode).toBe(401);
  });

  it('a new word is asked once, kept for the subject, and paid from the Professor quota', async () => {
    const write = ok([saved]);
    const { app, ai } = await build(student, { lessons: lesson(), terms: ok([]), dictionary_entries: [ok(null), write], 'rpc:billing_reserve_quota': hold(), 'rpc:billing_settle_quota': ok(true) });
    const res = await lookup(app, 'repeat');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ source: 'dictionary', term: { id: saved.id, term_en: 'repeat' }, remaining: 10_000 + 600 - 350 });
    expect(ai.calls[0]!.content).toContain('Subject: Informatics');
    expect(ai.calls[0]!.content).toContain('Selection: repeat');
    expect(write.inserted[0]).toMatchObject({ subject_id: SUBJECT, source_lang: 'en', query: 'repeat', ...ENTRY, created_by: 'student-1' });
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:commit']);
  });

  it('two learners asking at once keep one entry: the loser reads the winner', async () => {
    const { app } = await build(student, { lessons: lesson(), terms: ok([]), dictionary_entries: [ok(null), ok([]), ok(saved)], 'rpc:billing_reserve_quota': hold(), 'rpc:billing_settle_quota': ok(true) });
    expect((await lookup(app, 'repeat')).json()).toMatchObject({ term: { id: saved.id } });
  });

  it('an unusable or failed answer is not paid and says so', async () => {
    for (const reply of ['not json', new Error('down')]) {
      rpcCalls.length = 0;
      const { app } = await build(student, { lessons: lesson(), terms: ok([]), dictionary_entries: ok(null), 'rpc:billing_reserve_quota': hold(), 'rpc:billing_settle_quota': ok(true) }, provider([reply]));
      expect((await lookup(app, 'repeat')).statusCode).toBe(502);
      expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:release']);
    }
  });

  it('not a word: 404, nothing kept, the tokens counted', async () => {
    const entries = ok(null);
    const { app } = await build(student, { lessons: lesson(), terms: ok([]), dictionary_entries: entries, 'rpc:billing_reserve_quota': hold(), 'rpc:billing_settle_quota': ok(true) }, provider(['{"found": false}']));
    expect((await lookup(app, 'blorf')).statusCode).toBe(404);
    expect(entries.inserted).toHaveLength(0);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:commit']);
  });

  it('an exhausted quota is 429 and the AI is not asked', async () => {
    const { app, ai } = await build(student, {
      lessons: lesson(), terms: ok([]), dictionary_entries: ok(null),
      'rpc:billing_reserve_quota': mockQuery({ data: null, error: { code: 'P0001', message: 'QUOTA_EXCEEDED' } }),
      'rpc:billing_get_effective_quotas': ok([]),
    });
    const res = await lookup(app, 'repeat');
    expect(res.statusCode).toBe(429);
    expect(res.json().code).toBe('QUOTA_EXCEEDED');
    expect(ai.calls).toHaveLength(0);
  });
});
