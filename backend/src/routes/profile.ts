import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { sniffImageType } from './media.js';

// A signed-in user's own name, avatar and cover photo. Pictures go to the R2 media store under
// profiles/<user id>/; each account keeps one avatar and one cover, so a replaced or removed
// picture is deleted from the store once the profile points away from it.

export const PROFILE_IMAGE_LIMITS = { avatar: 1024 * 1024, cover: 2 * 1024 * 1024 } as const;
type Kind = keyof typeof PROFILE_IMAGE_LIMITS;
const COLUMN = { avatar: 'avatar_url', cover: 'cover_url' } as const;
const NAME_MAX = 50;
const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;

const unauthorized = { error: 'Hãy đăng nhập lại.', error_en: 'Sign in again.' };
const unavailable = { error: 'Kho ảnh chưa sẵn sàng.', error_en: 'Image storage is not available yet.' };
const notSaved = { error: 'Chưa lưu được ảnh. Thử lại sau nhé.', error_en: 'The picture could not be saved. Try again later.' };

function userId(request: FastifyRequest): string | null {
  return (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? null;
}

function readKind(request: FastifyRequest): Kind | null {
  const kind = (request.query as { kind?: string } | undefined)?.kind;
  return kind === 'avatar' || kind === 'cover' ? kind : null;
}

const tooLarge = (kind: Kind) =>
  kind === 'avatar'
    ? { error: 'Ảnh đại diện tối đa 1 MB.', error_en: 'The avatar is up to 1 MB.' }
    : { error: 'Ảnh bìa tối đa 2 MB.', error_en: 'The cover photo is up to 2 MB.' };

export const profileRoutes: FastifyPluginAsync = async (app) => {
  // Raw image bodies, only up to the larger limit; each kind is checked against its own below.
  app.addContentTypeParser(Object.values(MIME), { parseAs: 'buffer', bodyLimit: PROFILE_IMAGE_LIMITS.cover }, (_req, body, done) => done(null, body));

  app.setErrorHandler((error, request, reply) => {
    if (error.statusCode === 413) return reply.code(413).send(tooLarge(readKind(request) ?? 'cover'));
    if (error.statusCode === 415) return reply.code(415).send({ error: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.', error_en: 'Only PNG, JPG or WEBP images.' });
    request.log.error({ err: error }, 'Profile request failed');
    return reply.code(error.statusCode ?? 500).send(notSaved);
  });

  /** The store key of a picture URL, only when it is one of this user's own profile pictures. */
  const ownKey = (url: string | null | undefined, id: string): string | null => {
    if (!url || !app.mediaStore) return null;
    const base = app.mediaStore.publicUrl('');
    if (!url.startsWith(base)) return null;
    const key = url.slice(base.length);
    return key.startsWith(`profiles/${id}/`) && !key.includes('..') ? key : null;
  };

  const removeQuietly = async (request: FastifyRequest, key: string | null) => {
    if (!key || !app.mediaStore) return;
    try {
      await app.mediaStore.remove(key);
    } catch (err) {
      request.log.warn({ err, key }, 'Old profile picture was not removed');
    }
  };

  /** The menu bar reads the avatar from the account, like the name. */
  const mirrorAvatar = async (request: FastifyRequest, id: string, url: string | null) => {
    const { error } = await app.supabase!.auth.admin.updateUserById(id, { user_metadata: { avatar_url: url } });
    if (error) request.log.warn({ err: error }, 'Account avatar was not updated');
  };

  app.patch('/api/profile', async (request, reply) => {
    const id = userId(request);
    if (!id) return reply.code(401).send(unauthorized);
    const raw = ((request.body ?? {}) as { display_name?: unknown }).display_name;
    const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
    if (!name || name.length > NAME_MAX) {
      return reply.code(400).send({ error: `Tên dài từ 1 đến ${NAME_MAX} ký tự.`, error_en: `The name is 1 to ${NAME_MAX} characters.` });
    }
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send({ error: 'Dịch vụ chưa sẵn sàng.', error_en: 'The service is not available.' });
    const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', id).select('id').maybeSingle();
    if (error) {
      request.log.error({ err: error }, 'Profile name update failed');
      return reply.code(500).send({ error: 'Chưa lưu được tên. Thử lại sau nhé.', error_en: 'The name could not be saved. Try again later.' });
    }
    // The menu bar reads the name from the account, so keep both in step.
    const { error: authError } = await supabase.auth.admin.updateUserById(id, { user_metadata: { display_name: name } });
    if (authError) request.log.warn({ err: authError }, 'Account display name was not updated');
    return reply.send({ display_name: name });
  });

  app.post('/api/profile/image', { bodyLimit: PROFILE_IMAGE_LIMITS.cover }, async (request: FastifyRequest, reply: FastifyReply) => {
    const id = userId(request);
    if (!id) return reply.code(401).send(unauthorized);
    const kind = readKind(request);
    if (!kind) return reply.code(400).send({ error: 'Loại ảnh không hợp lệ.', error_en: 'Unknown picture kind.' });
    const store = app.mediaStore;
    const supabase = app.supabase;
    if (!store || !supabase) return reply.code(503).send(unavailable);
    const body = request.body;
    if (!Buffer.isBuffer(body)) return reply.code(415).send({ error: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.', error_en: 'Only PNG, JPG or WEBP images.' });
    if (body.length > PROFILE_IMAGE_LIMITS[kind]) return reply.code(413).send(tooLarge(kind));
    const type = sniffImageType(body);
    if (!type) return reply.code(400).send({ error: 'Tệp không phải ảnh PNG, JPG hoặc WEBP.', error_en: 'The file is not a PNG, JPG or WEBP image.' });

    const { data: current, error: readError } = await supabase.from('profiles').select('avatar_url, cover_url').eq('id', id).maybeSingle();
    if (readError) {
      request.log.error({ err: readError }, 'Profile read failed');
      return reply.code(500).send(notSaved);
    }
    const key = `profiles/${id}/${kind}-${randomUUID()}.${type === 'jpeg' ? 'jpg' : type}`;
    try {
      await store.put(key, body, MIME[type]);
    } catch (err) {
      request.log.error({ err }, 'Profile picture upload failed');
      return reply.code(500).send(notSaved);
    }
    const url = store.publicUrl(key);
    const { error } = await supabase.from('profiles').update({ [COLUMN[kind]]: url }).eq('id', id).select('id').maybeSingle();
    if (error) {
      request.log.error({ err: error }, 'Profile picture save failed');
      await removeQuietly(request, key);
      return reply.code(500).send(notSaved);
    }
    const old = (current as Record<string, string | null> | null)?.[COLUMN[kind]];
    await removeQuietly(request, ownKey(old, id));
    if (kind === 'avatar') await mirrorAvatar(request, id, url);
    return reply.code(201).send({ url });
  });

  app.delete('/api/profile/image', async (request, reply) => {
    const id = userId(request);
    if (!id) return reply.code(401).send(unauthorized);
    const kind = readKind(request);
    if (!kind) return reply.code(400).send({ error: 'Loại ảnh không hợp lệ.', error_en: 'Unknown picture kind.' });
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { data: current, error: readError } = await supabase.from('profiles').select('avatar_url, cover_url').eq('id', id).maybeSingle();
    if (readError) return reply.code(500).send(notSaved);
    const { error } = await supabase.from('profiles').update({ [COLUMN[kind]]: null }).eq('id', id).select('id').maybeSingle();
    if (error) return reply.code(500).send(notSaved);
    await removeQuietly(request, ownKey((current as Record<string, string | null> | null)?.[COLUMN[kind]], id));
    if (kind === 'avatar') await mirrorAvatar(request, id, null);
    return reply.code(204).send();
  });
};
