import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

/** Vercel rejects request bodies over 4.5 MB, so images stop at 4 MB. */
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;
const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;
type ImageType = keyof typeof MIME;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The image type from its first bytes; anything else (GIF, SVG, …) is null. */
export function sniffImageType(buf: Buffer): ImageType | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

type MediaUser = { id?: string; app_metadata?: { app_role?: string } };

const TOO_LARGE = { error: 'Ảnh lớn hơn 4 MB.' };
const WRONG_TYPE = { error: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.' };

/**
 * Lesson images. Registered as its own plugin so the raw-body parsers stay scoped to this route.
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
    const type = sniffImageType(body);
    if (!type) return reply.code(400).send({ error: 'Tệp không phải ảnh PNG, JPG hoặc WEBP.', error_en: 'The file is not a PNG, JPG or WEBP image.' });

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
