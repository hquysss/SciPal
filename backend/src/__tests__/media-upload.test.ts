import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { inspectMedia, mediaRoutes, sniffImageType, MAX_MEDIA_BYTES } from '../routes/media.js';

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
      remove: async () => {},
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
    // SVG, WebM and Lottie are told apart (and checked) by inspectMedia, not by sniffImageType.
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

  it('still refuses a type it does not know (a GIF or a PDF)', async () => {
    const { app } = await build('teacher');
    const res = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'application/pdf' }, payload: '%PDF-1.4' });
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

describe('inspectMedia: SVG, WebM and Lottie', () => {
  const svg = (inner: string) => Buffer.from(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${inner}</svg>`);
  const lottie = (extra: object = {}) => Buffer.from(JSON.stringify({ v: '5.7.0', fr: 30, ip: 0, op: 60, w: 100, h: 100, layers: [], ...extra }));
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from([0x9f, 0x42, 0x82, 0x84]), Buffer.from('webm'), Buffer.alloc(32)]);

  it('accepts plain shapes with animation, a WebM, and a clean Lottie', () => {
    expect(inspectMedia(svg('<defs><linearGradient id="g"/></defs><rect fill="url(#g)" width="5" height="5"><animate attributeName="x" from="0" to="5" dur="1s" repeatCount="indefinite"/></rect><use href="#a"/>'))).toEqual({ ok: true, type: 'svg' });
    expect(inspectMedia(webm)).toEqual({ ok: true, type: 'webm' });
    expect(inspectMedia(lottie())).toEqual({ ok: true, type: 'json' });
  });

  it.each([
    ['a script', '<script>alert(1)</script>'],
    ['an event handler', '<rect width="1" height="1" onload="alert(1)"/>'],
    ['a javascript link', '<a href="javascript:alert(1)"><rect/></a>'],
    ['an outside image', '<image href="https://evil.test/x.png"/>'],
    ['an outside xlink', '<use xlink:href="https://evil.test/x.svg#a"/>'],
    ['foreignObject', '<foreignObject><div>hi</div></foreignObject>'],
    ['an outside css url', '<rect style="fill:url(https://evil.test/x)"/>'],
    ['an @import', '<style>@import "https://evil.test/x.css";</style>'],
    ['an animated link', '<a href="#x"><set attributeName="href" to="javascript:alert(1)"/></a>'],
  ])('refuses an SVG with %s', (_name, inner) => {
    expect(inspectMedia(svg(inner)).ok).toBe(false);
  });

  it('refuses an SVG entity declaration', () => {
    expect(inspectMedia(Buffer.from('<!DOCTYPE svg [<!ENTITY a "b">]><svg xmlns="http://www.w3.org/2000/svg">&a;</svg>')).ok).toBe(false);
  });

  it('refuses a Lottie with expressions or outside files, and JSON that is not Lottie', () => {
    expect(inspectMedia(lottie({ layers: [{ ks: { o: { a: 0, k: 1, x: 'time*2' } } }] })).ok).toBe(false);
    expect(inspectMedia(lottie({ assets: [{ id: 'i', u: 'https://evil.test/', p: 'x.png' }] })).ok).toBe(false);
    expect(inspectMedia(Buffer.from('{"hello":1}')).ok).toBe(false);
    expect(inspectMedia(Buffer.from('not json')).ok).toBe(false);
  });

  it('refuses a plain Matroska video and a binary that only looks like text', () => {
    expect(inspectMedia(Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from('matroska'), Buffer.alloc(32)])).ok).toBe(false);
    expect(inspectMedia(Buffer.concat([Buffer.from('<svg>'), Buffer.alloc(8)])).ok).toBe(false);
  });
});

describe('POST /api/authoring/media with the new types', () => {
  const lottieJson = JSON.stringify({ v: '5', fr: 30, ip: 0, op: 30, w: 10, h: 10, layers: [] });

  it('stores a Lottie as .json and an SVG as .svg with the right type', async () => {
    const { app, storage } = await build('teacher');
    const a = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'application/json' }, payload: lottieJson });
    expect(a.statusCode).toBe(201);
    expect(a.json().url).toMatch(/\.json$/);
    const b = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/svg+xml' }, payload: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    expect(b.statusCode).toBe(201);
    expect(b.json().url).toMatch(/\.svg$/);
    expect(storage.uploads.map((u) => u.type)).toEqual(['application/json', 'image/svg+xml']);
    await app.close();
  });

  it('refuses a script SVG with a message that says why', async () => {
    const { app, storage } = await build('teacher');
    const res = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/svg+xml' }, payload: '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/SVG/);
    expect(storage.uploads).toHaveLength(0);
    await app.close();
  });
});
