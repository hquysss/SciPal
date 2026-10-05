import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { mediaRoutes, sniffImageType, MAX_MEDIA_BYTES } from '../routes/media.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32)]);

function storageMock() {
  const uploads: Array<{ path: string; type?: string }> = [];
  return {
    uploads,
    store: {
      put: async (path: string, _b: Buffer, contentType: string) => {
        uploads.push({ path, type: contentType });
      },
      publicUrl: (path: string) => `https://pub-test.r2.dev/${path}`,
    },
  };
}

async function build(role: string, storage = storageMock()) {
  const app = Fastify();
  app.decorate('mediaStore', storage.store);
  app.addHook('onRequest', async (req) => {
    (req as any).user = { id: 'teacher-1', app_metadata: { app_role: role } };
  });
  await app.register(mediaRoutes);
  await app.ready();
  return { app, storage };
}

describe('sniffImageType', () => {
  it('reads magic bytes, not names', () => {
    expect(sniffImageType(PNG)).toBe('png');
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(sniffImageType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]))).toBe('webp');
    expect(sniffImageType(GIF)).toBeNull();
    expect(sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
  });
});

describe('POST /api/authoring/media', () => {
  it('stores a png under the teacher folder and returns its public URL', async () => {
    const { app, storage } = await build('teacher');
    const res = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/png' }, payload: PNG });
    expect(res.statusCode).toBe(201);
    expect(res.json().url).toMatch(/^https:\/\/pub-test\.r2\.dev\/teacher-1\/[0-9a-f-]{36}\.png$/);
    expect(storage.uploads[0]).toMatchObject({ type: 'image/png' });
    await app.close();
  });

  it('refuses a GIF sent as image/png', async () => {
    const { app, storage } = await build('teacher');
    const res = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/png' }, payload: GIF });
    expect(res.statusCode).toBe(400);
    expect(storage.uploads).toHaveLength(0);
    await app.close();
  });

  it('refuses files over 4 MB', async () => {
    const { app } = await build('teacher');
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_MEDIA_BYTES)]);
    const res = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/png' }, payload: big });
    expect(res.statusCode).toBe(413);
    expect(res.json().error).toMatch(/4 MB/);
    await app.close();
  });

  it('refuses SVG', async () => {
    const { app } = await build('teacher');
    const res = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/svg+xml' }, payload: '<svg/>' });
    expect(res.statusCode).toBe(415);
    await app.close();
  });

  it('refuses learners', async () => {
    const { app, storage } = await build('student');
    const res = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/png' }, payload: PNG });
    expect(res.statusCode).toBe(403);
    expect(storage.uploads).toHaveLength(0);
    await app.close();
  });
});
