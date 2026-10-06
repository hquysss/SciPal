import fp from 'fastify-plugin';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface MediaStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Deletes one object (a replaced profile picture). */
  remove(key: string): Promise<void>;
  publicUrl(key: string): string;
}

declare module 'fastify' {
  interface FastifyInstance {
    mediaStore?: MediaStore;
  }
}

/** Lesson images live in a Cloudflare R2 bucket, written through its S3 API with a backend-only key. */
export const mediaStorePlugin = fp(async (app) => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.MEDIA_PUBLIC_URL?.replace(/\/+$/, '');
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) return;

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  app.decorate('mediaStore', {
    async put(key, body, contentType) {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
    },
    async remove(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    publicUrl: (key) => `${publicBase}/${key}`,
  } satisfies MediaStore);
});
