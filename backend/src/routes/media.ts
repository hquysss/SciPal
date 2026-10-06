import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

/** Vercel rejects request bodies over 4.5 MB, so media stop at 4 MB. */
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;
const MIME = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  webm: 'video/webm',
  svg: 'image/svg+xml',
  // A Lottie animation: JSON, stored as `.json`.
  json: 'application/json',
} as const;
type MediaType = keyof typeof MIME;
type ImageType = 'png' | 'jpeg' | 'webp';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The image type from its first bytes; anything else (GIF, SVG, …) is null. */
export function sniffImageType(buf: Buffer): ImageType | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

const EBML = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

/** Anything in an SVG that can run code, reach another site or pull in another document. */
const SVG_UNSAFE: RegExp[] = [
  /<script/i,
  /\bon[a-z]+\s*=/i,
  /javascript:/i,
  /<(?:foreignObject|iframe|embed|object|audio|video)\b/i,
  /<!ENTITY/i,
  /<!DOCTYPE[^>]*\[/i,
  /@import/i,
  // A link may only point inside the file (#id) or at an embedded picture.
  /\bhref\s*=\s*["']\s*(?!#|data:image\/(?:png|jpeg|webp);base64,)/i,
  /\burl\(\s*["']?\s*(?!#)/i,
  // An animation that rewrites a link after load.
  /<(?:animate|set)\b[^>]*attributeName\s*=\s*["']?(?:xlink:)?href/i,
];

type Inspected = { ok: true; type: MediaType } | { ok: false; error: string; error_en: string };
const BAD = (vi: string, en: string): Inspected => ({ ok: false, error: vi, error_en: en });

/** An SVG when `text` is one and nothing in it can run or load anything; null when it is not an SVG at all. */
function inspectSvg(text: string): Inspected | null {
  const head = text.replace(/^\uFEFF/, '').trimStart();
  if (!/^(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) return null;
  if (SVG_UNSAFE.some((rule) => rule.test(text))) {
    return BAD('SVG có mã chạy được hoặc liên kết ra ngoài. Hãy xuất lại SVG thuần hình (không script, không liên kết).', 'The SVG has runnable code or outside links. Export a plain-shapes SVG (no scripts, no links).');
  }
  return { ok: true, type: 'svg' };
}

/**
 * A Lottie file when `text` is one. Expressions (a string under `x`) are JavaScript the player would run, and
 * a web address is a file it would fetch, so either one is refused.
 */
function inspectLottie(text: string): Inspected | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const lottie = json as { w?: unknown; h?: unknown; fr?: unknown; ip?: unknown; op?: unknown; layers?: unknown } | null;
  if (!lottie || typeof lottie !== 'object' || ![lottie.w, lottie.h, lottie.fr, lottie.ip, lottie.op].every((n) => typeof n === 'number') || !Array.isArray(lottie.layers)) return null;
  const stack: unknown[] = [json];
  while (stack.length) {
    const node = stack.pop();
    if (typeof node === 'string') {
      if (/^(?:https?:)?\/\//i.test(node)) return BAD('Lottie có đường dẫn ra ngoài. Hãy nhúng ảnh vào tệp.', 'The Lottie file links to outside files. Embed the images in the file.');
    } else if (Array.isArray(node)) stack.push(...node);
    else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'x' && typeof value === 'string') return BAD('Lottie có biểu thức (mã JavaScript). Hãy xuất lại không kèm biểu thức.', 'The Lottie file has expressions (JavaScript). Export it without expressions.');
        stack.push(value);
      }
    }
  }
  return { ok: true, type: 'json' };
}

/** What an uploaded file really is, from its bytes, and whether it is safe to store and show. */
export function inspectMedia(buf: Buffer): Inspected {
  const image = sniffImageType(buf);
  if (image) return { ok: true, type: image };
  // WebM is Matroska with a "webm" document type; a plain .mkv is not accepted.
  if (buf.length >= 4 && buf.subarray(0, 4).equals(EBML) && buf.subarray(0, 64).includes('webm')) return { ok: true, type: 'webm' };
  if (!buf.subarray(0, 512).includes(0)) {
    const text = buf.toString('utf8');
    const found = inspectSvg(text) ?? inspectLottie(text);
    if (found) return found;
  }
  return BAD('Tệp không phải ảnh PNG, JPG, WEBP, SVG, video WebM hay Lottie (JSON).', 'The file is not a PNG, JPG, WEBP, SVG, WebM video or Lottie (JSON) file.');
}

type MediaUser = { id?: string; app_metadata?: { app_role?: string } };

const TOO_LARGE = { error: 'Tệp lớn hơn 4 MB.', error_en: 'The file is larger than 4 MB.' };
const WRONG_TYPE = { error: 'Chỉ nhận ảnh PNG, JPG, WEBP, SVG, video WebM hoặc Lottie (JSON).', error_en: 'Only PNG, JPG, WEBP, SVG, WebM video or Lottie (JSON) files.' };

/**
 * Lesson media (images, SVG, WebM, Lottie). Registered as its own plugin so the raw-body parsers stay scoped to this route.
 * The R2 bucket is public to read; only this route (backend R2 key) writes, after checking the uploader
 * and the real file type.
 */
export const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser(Object.values(MIME), { parseAs: 'buffer', bodyLimit: MAX_MEDIA_BYTES }, (_req, body, done) => done(null, body));

  app.setErrorHandler((error, request, reply) => {
    if (error.statusCode === 413) return reply.code(413).send(TOO_LARGE);
    if (error.statusCode === 415) return reply.code(415).send(WRONG_TYPE);
    request.log.error({ err: error }, 'Lesson image request failed');
    return reply.code(error.statusCode ?? 500).send({ error: 'Không tải được ảnh lên.', error_en: 'Could not upload the image.' });
  });

  app.post('/api/authoring/media', { bodyLimit: MAX_MEDIA_BYTES }, async (request: FastifyRequest, reply) => {
    const user = (request as FastifyRequest & { user?: MediaUser }).user;
    const role = user?.app_metadata?.app_role;
    if (!user?.id || (role !== 'teacher' && role !== 'admin')) {
      return reply.code(403).send({ error: 'Chỉ giáo viên mới tải ảnh lên được.', error_en: 'Only teachers can upload images.' });
    }
    if (!app.mediaStore) return reply.code(503).send({ error: 'Kho ảnh chưa sẵn sàng.', error_en: 'Image storage is not available yet.' });
    const body = request.body;
    if (!Buffer.isBuffer(body)) return reply.code(415).send(WRONG_TYPE);
    const found = inspectMedia(body);
    if (!found.ok) {
      const { error, error_en } = found;
      return reply.code(400).send({ error, error_en });
    }
    const { type } = found;

    const path = `${user.id}/${randomUUID()}.${type === 'jpeg' ? 'jpg' : type}`;
    try {
      await app.mediaStore.put(path, body, MIME[type]);
    } catch (err) {
      request.log.error({ err }, 'Lesson image upload failed');
      return reply.code(500).send({ error: 'Không tải được ảnh lên. Thử lại sau.', error_en: 'Could not upload the image. Try again later.' });
    }
    return reply.code(201).send({ url: app.mediaStore.publicUrl(path) });
  });
};
