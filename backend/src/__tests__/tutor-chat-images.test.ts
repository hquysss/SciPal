import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { tutorRoutes } from '../routes/tutor.js';
import { completionRequest } from '../providers/ai.js';
import { mockQuery, mockSupabase as rawSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const C1 = 'c0000000-0000-4000-8000-000000000001';
const student = { id: 'student-1', app_metadata: {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const quota = mockQuery({ data: { operation_id: 'd0000000-0000-4000-8000-000000000001', state: 'reserved', kind: 'daily', remaining: 99, resets_at: '2026-09-28T17:00:00+00:00' }, error: null });

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
const picture = { mime: 'image/jpeg', data: JPEG.toString('base64') };

function provider(chunks: string[], fail = false) {
  const calls: Array<{ messages: Array<{ role: string; content: string; image?: { mime: string; data: string } }>; system: string }> = [];
  return {
    calls,
    chat: async function* (messages: never, system: string) {
      calls.push({ messages, system });
      if (fail) throw new Error('provider down');
      for (const c of chunks) yield c;
    },
  };
}

/** A storage client that records uploads and removals, and signs every path except ones named `bad`. */
function storage(uploadError: { message: string } | null = null) {
  const upload = vi.fn().mockResolvedValue({ data: {}, error: uploadError });
  const remove = vi.fn().mockResolvedValue({ data: [], error: null });
  const createSignedUrls = vi.fn(async (paths: string[]) => ({
    data: paths.map((path) => (path.includes('bad') ? { path, signedUrl: '', error: 'nope' } : { path, signedUrl: `https://signed.test/${path}`, error: null })),
    error: null,
  }));
  return { upload, remove, createSignedUrls, client: { from: () => ({ upload, remove, createSignedUrls }) } };
}

async function build(tables: Record<string, MockBuilder | MockBuilder[]>, store = storage(), ai = provider(['Em đọc đề là…'])) {
  const app = Fastify();
  const supabase = rawSupabase({ 'rpc:billing_reserve_quota': quota, 'rpc:billing_settle_quota': mockQuery({ data: true, error: null }), ...tables });
  app.decorate('supabase', Object.assign(supabase, { storage: store.client }));
  app.decorate('aiProvider', ai);
  app.addHook('onRequest', async (req) => { (req as any).user = student; });
  await app.register(tutorRoutes);
  await app.ready();
  return { app, store, ai };
}

/** The tables of a question in a new conversation: day count, the question, the history read back, the answer. */
const newQuestion = (history: unknown[], insert: MockBuilder = ok({ id: 'q1' })) => ({
  tutor_conversations: [ok({ id: C1 }), ok()],
  tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), insert, ok(history), ok()],
  profiles: ok(null),
});

const post = (app: Awaited<ReturnType<typeof build>>['app'], payload: unknown) => app.inject({ method: 'POST', url: '/api/tutor/chat', payload: payload as never });

describe('POST /api/tutor/chat with a picture', () => {
  it('stores the picture, asks the default question, and hands the model the picture and the picture rules', async () => {
    const { app, store, ai } = await build(newQuestion([{ role: 'user', content: 'Em gửi thầy ảnh này.' }]));
    const res = await post(app, { message: '  ', image: picture, language: 'vi' });
    expect(res.statusCode).toBe(200);
    // Up first, under the user and the conversation, as a JPEG.
    const [path, bytes, options] = store.upload.mock.calls[0] as [string, Buffer, { contentType: string; upsert: boolean }];
    expect(path).toMatch(new RegExp(`^student-1/${C1}/[0-9a-f-]{36}\\.jpg$`));
    expect(bytes.equals(JPEG)).toBe(true);
    expect(options).toMatchObject({ contentType: 'image/jpeg', upsert: false });
    // The question row names the picture; the model reads the picture on this turn.
    const question = ai.calls[0]!;
    expect(question.messages.at(-1)).toMatchObject({ role: 'user', content: 'Em gửi thầy ảnh này.', image: { mime: 'image/jpeg', data: picture.data } });
    expect(question.system).toMatch(/attached a picture/);
    expect(question.system).not.toMatch(/never ask for a photo/);
    await app.close();
  });

  it('keeps what the student wrote beside the picture', async () => {
    const insert = ok({ id: 'q1' });
    const { app, ai } = await build(newQuestion([{ role: 'user', content: 'Giải câu 3 giúp em' }], insert));
    await post(app, { message: 'Giải câu 3 giúp em', image: picture, language: 'vi' });
    expect(insert.inserted[0]).toMatchObject({ content: 'Giải câu 3 giúp em', image_path: expect.stringMatching(/\.jpg$/) });
    expect(ai.calls[0]!.messages.at(-1)!.content).toBe('Giải câu 3 giúp em');
    await app.close();
  });

  it('without a picture nothing is uploaded, and the model is still told it cannot ask for photos', async () => {
    const insert = ok({ id: 'q1' });
    const { app, store, ai } = await build(newQuestion([{ role: 'user', content: 'Hỏi' }], insert));
    await post(app, { message: 'Hỏi', language: 'vi' });
    expect(store.upload).not.toHaveBeenCalled();
    expect(insert.inserted[0]).not.toHaveProperty('image_path');
    expect(ai.calls[0]!.system).toMatch(/never ask for a photo/);
    expect(ai.calls[0]!.messages.every((m) => !m.image)).toBe(true);
    await app.close();
  });

  it('refuses a picture that is not valid before storing or counting anything', async () => {
    const { app, store } = await build({});
    for (const image of [{ mime: 'image/png', data: Buffer.from('GIF89a' + 'x'.repeat(30)).toString('base64') }, { mime: 'image/jpeg', data: '***' }, 'photo', {}]) {
      const res = await post(app, { message: 'Hỏi', image, language: 'vi' });
      expect(res.statusCode, JSON.stringify(image)).toBe(400);
      expect(JSON.parse(res.body)).toHaveProperty('error_en');
    }
    expect(store.upload).not.toHaveBeenCalled();
    await app.close();
  });

  it('still needs a question when there is no picture', async () => {
    const { app } = await build({});
    expect((await post(app, { message: '', image: null, language: 'vi' })).statusCode).toBe(400);
    await app.close();
  });

  it('answers with an error and no question when the store refuses the picture', async () => {
    const insert = ok({ id: 'q1' });
    const { app, store } = await build(newQuestion([], insert), storage({ message: 'store down' }));
    const res = await post(app, { message: 'Hỏi', image: picture, language: 'vi' });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error_en).toMatch(/picture/);
    expect(insert.inserted).toEqual([]);
    expect(store.remove).not.toHaveBeenCalled();
    await app.close();
  });

  it('takes the picture back when the question cannot be stored', async () => {
    const failedInsert = mockQuery({ data: null, error: { message: 'insert failed' } });
    const { app, store } = await build(newQuestion([], failedInsert));
    const res = await post(app, { message: 'Hỏi', image: picture, language: 'vi' });
    expect(res.statusCode).toBe(500);
    const uploaded = (store.upload.mock.calls[0] as [string])[0];
    expect(store.remove).toHaveBeenCalledWith([uploaded]);
    await app.close();
  });

  it('takes the picture back when the model gives no answer at all, with the question', async () => {
    const questionDelete = ok();
    const tables = newQuestion([{ role: 'user', content: 'Hỏi' }]);
    tables.tutor_messages = [mockQuery({ data: null, error: null, count: 0 }), ok({ id: 'q1' }), ok([{ role: 'user', content: 'Hỏi' }]), questionDelete];
    const { app, store } = await build(tables, storage(), provider([], true));
    await post(app, { message: 'Hỏi', image: picture, language: 'vi' });
    const uploaded = (store.upload.mock.calls[0] as [string])[0];
    expect(questionDelete.eqCalls).toContainEqual(['id', 'q1']);
    expect(store.remove).toHaveBeenCalledWith([uploaded]);
    await app.close();
  });

  it('a retry does not upload the picture again, and removes the stored one if the model fails again', async () => {
    const last = ok({ id: 'q1', role: 'user', content: 'Hỏi', image_path: `student-1/${C1}/old.jpg` });
    const questionDelete = ok();
    const { app, store } = await build({
      tutor_conversations: [ok({ id: C1, lesson_id: null }), ok()],
      tutor_messages: [last, mockQuery({ data: null, error: null, count: 0 }), ok([{ role: 'user', content: 'Hỏi' }]), questionDelete],
      profiles: ok(null),
    }, storage(), provider([], true));
    await post(app, { conversation_id: C1, message: 'Hỏi', image: picture, retry: true, language: 'vi' });
    expect(store.upload).not.toHaveBeenCalled();
    expect(store.remove).toHaveBeenCalledWith([`student-1/${C1}/old.jpg`]);
    await app.close();
  });

  it('shows the model only the current picture: an earlier one is said to have been sent', async () => {
    const { app, ai } = await build({
      tutor_conversations: [ok({ id: C1, lesson_id: null }), ok()],
      // Newest first, as the database returns them.
      tutor_messages: [mockQuery({ data: null, error: null, count: 0 }), ok({ id: 'q3' }), mockQuery({ data: [
        { role: 'user', content: 'Và câu b?', image_path: null },
        { role: 'assistant', content: 'Câu a là 5.', image_path: null },
        { role: 'user', content: 'Giải câu a', image_path: `student-1/${C1}/earlier.jpg` },
      ], error: null, count: 3 }), ok()],
      profiles: ok(null),
    });
    await post(app, { conversation_id: C1, message: 'Và câu b?', language: 'vi' });
    const [first, , last] = ai.calls[0]!.messages;
    expect(first!.content).toMatch(/^\(Học sinh đã gửi một ảnh/);
    expect(first!.content).toMatch(/Giải câu a$/);
    expect([first, last].every((m) => !m!.image)).toBe(true);
    await app.close();
  });
});

describe('completionRequest with a picture', () => {
  it('sends the picture as an image_url part of that message and leaves the others as plain text', () => {
    const request = completionRequest({ apiKey: 'k', baseURL: undefined, model: 'gpt-5-mini' }, [
      { role: 'user', content: 'Trước đó' },
      { role: 'assistant', content: 'Ừ' },
      { role: 'user', content: 'Đọc ảnh này', image: { mime: 'image/jpeg', data: 'QUJD' } },
    ], 'sys');
    const [, a, b, c] = request.messages as Array<{ role: string; content: unknown }>;
    expect([a!.content, b!.content]).toEqual(['Trước đó', 'Ừ']);
    expect(c).toEqual({
      role: 'user',
      content: [{ type: 'text', text: 'Đọc ảnh này' }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD' } }],
    });
  });
});

describe('reading and deleting a conversation with pictures', () => {
  it('gives each picture a signed link, null when it cannot be signed, and never the path', async () => {
    const { app, store } = await build({
      tutor_conversations: ok({ id: C1, title: 'Hỏi', lesson_id: null, updated_at: 'now' }),
      tutor_messages: ok([
        { id: 'm1', role: 'user', content: 'Ảnh', created_at: 't1', image_path: `student-1/${C1}/a.jpg` },
        { id: 'm2', role: 'assistant', content: 'Ừ', created_at: 't2', image_path: null },
        { id: 'm3', role: 'user', content: 'Ảnh hỏng', created_at: 't3', image_path: `student-1/${C1}/bad.jpg` },
      ]),
    });
    const res = await app.inject({ method: 'GET', url: `/api/tutor/conversations/${C1}` });
    const { messages } = JSON.parse(res.body) as { messages: Array<Record<string, unknown>> };
    expect(messages[0]).toMatchObject({ id: 'm1', image_url: `https://signed.test/student-1/${C1}/a.jpg` });
    expect(messages[1]).not.toHaveProperty('image_url');
    expect(messages[2]).toMatchObject({ image_url: null });
    expect(res.body).not.toContain('image_path');
    expect(store.createSignedUrls).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('does not ask the store to sign anything when no message has a picture', async () => {
    const { app, store } = await build({
      tutor_conversations: ok({ id: C1, title: 'Hỏi', lesson_id: null, updated_at: 'now' }),
      tutor_messages: ok([{ id: 'm1', role: 'user', content: 'Hỏi', created_at: 't1', image_path: null }]),
    });
    await app.inject({ method: 'GET', url: `/api/tutor/conversations/${C1}` });
    expect(store.createSignedUrls).not.toHaveBeenCalled();
    await app.close();
  });

  it('deletes the pictures before the conversation', async () => {
    const conversations = ok([{ id: C1 }]);
    const { app, store } = await build({
      tutor_messages: ok([{ image_path: `student-1/${C1}/a.jpg` }, { image_path: `student-1/${C1}/b.jpg` }]),
      tutor_conversations: conversations,
    });
    const res = await app.inject({ method: 'DELETE', url: `/api/tutor/conversations/${C1}` });
    expect(res.statusCode).toBe(204);
    expect(store.remove).toHaveBeenCalledWith([`student-1/${C1}/a.jpg`, `student-1/${C1}/b.jpg`]);
    expect(conversations.deleteCalls).toBe(1);
    await app.close();
  });

  it('keeps the conversation when its pictures cannot be deleted, so it can be tried again', async () => {
    const conversations = ok([{ id: C1 }]);
    const store = storage();
    store.remove.mockResolvedValue({ data: null, error: { message: 'store down' } });
    const { app } = await build({ tutor_messages: ok([{ image_path: `student-1/${C1}/a.jpg` }]), tutor_conversations: conversations }, store);
    const res = await app.inject({ method: 'DELETE', url: `/api/tutor/conversations/${C1}` });
    expect(res.statusCode).toBe(500);
    expect(conversations.deleteCalls).toBe(0);
    await app.close();
  });

  it('deletes a conversation without pictures as before', async () => {
    const { app, store } = await build({ tutor_messages: ok([]), tutor_conversations: ok([{ id: C1 }]) });
    expect((await app.inject({ method: 'DELETE', url: `/api/tutor/conversations/${C1}` })).statusCode).toBe(204);
    expect(store.remove).not.toHaveBeenCalled();
    await app.close();
  });
});
