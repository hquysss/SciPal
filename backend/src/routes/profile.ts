import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { orderPair } from './friends.js';
import { sniffImageType } from './media.js';

// A signed-in user's own name, avatar and cover photo. Pictures go to the R2 media store under
// profiles/<user id>/; each account keeps one avatar and one cover, so a replaced or removed
// picture is deleted from the store once the profile points away from it.

export const PROFILE_IMAGE_LIMITS = { avatar: 1024 * 1024, cover: 2 * 1024 * 1024 } as const;
type Kind = keyof typeof PROFILE_IMAGE_LIMITS;
const COLUMN = { avatar: 'avatar_url', cover: 'cover_url' } as const;
const NAME_MAX = 50;
const SCHOOL_MAX = 100;
const BIO_MAX = 250;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

  // The "about" part of the profile: grade, school and bio, each of school and bio hidden from others on request.
  app.patch('/api/profile/about', async (request, reply) => {
    const id = userId(request);
    if (!id) return reply.code(401).send(unauthorized);
    const b = (request.body ?? {}) as Record<string, unknown>;
    const text = (v: unknown, max: number): string | null | undefined =>
      v === null ? null : typeof v === 'string' && v.trim().length <= max ? v.trim() || null : undefined;
    const grade = b.grade === null || b.grade === 10 || b.grade === 11 || b.grade === 12 ? b.grade : undefined;
    const school = text(b.school, SCHOOL_MAX);
    const bio = text(b.bio, BIO_MAX);
    if (grade === undefined || school === undefined || bio === undefined || typeof b.show_school !== 'boolean' || typeof b.show_bio !== 'boolean') {
      return reply.code(400).send({ error: 'Thông tin chưa hợp lệ.', error_en: 'Some details are not valid.' });
    }
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send({ error: 'Dịch vụ chưa sẵn sàng.', error_en: 'The service is not available.' });
    const { error } = await supabase.from('profiles')
      .update({ grade, school, bio, show_school: b.show_school, show_bio: b.show_bio }).eq('id', id).select('id').maybeSingle();
    if (error) {
      request.log.error({ err: error }, 'Profile about update failed');
      return reply.code(500).send(notSaved);
    }
    return reply.send({});
  });

  // Anyone signed in can open a profile ("me" is the caller). Hidden school or bio are left out unless it is your own.
  app.get('/api/profile/:user_id', async (request, reply) => {
    const me = userId(request);
    if (!me) return reply.code(401).send(unauthorized);
    const param = (request.params as { user_id: string }).user_id;
    const target = param === 'me' ? me : param;
    if (!UUID_PATTERN.test(target)) return reply.code(404).send({ error: 'Không tìm thấy.', error_en: 'Not found.' });
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send({ error: 'Dịch vụ chưa sẵn sàng.', error_en: 'The service is not available.' });

    const profile = await supabase.from('profiles')
      .select('id, display_name, avatar_url, cover_url, role, grade, school, bio, show_school, show_bio').eq('id', target).maybeSingle();
    if (profile.error) return reply.code(500).send(notSaved);
    const p = profile.data as {
      id: string; display_name: string | null; avatar_url: string | null; cover_url: string | null; role: string | null;
      grade: number | null; school: string | null; bio: string | null; show_school: boolean; show_bio: boolean;
    } | null;
    if (!p) return reply.code(404).send({ error: 'Không tìm thấy.', error_en: 'Not found.' });
    const isMe = target === me;

    let relation: 'me' | 'none' | 'friend' | 'pending_out' | 'pending_in' | 'blocked' = 'me';
    let friendshipId: string | null = null;
    if (!isMe) {
      const [a, b] = orderPair(me, target);
      const [pair, blocks] = await Promise.all([
        supabase.from('friendships').select('id, requested_by, status').eq('user_a', a).eq('user_b', b).maybeSingle(),
        supabase.from('chat_blocks').select('blocker_id')
          .or(`and(blocker_id.eq.${me},blocked_id.eq.${target}),and(blocker_id.eq.${target},blocked_id.eq.${me})`).limit(1),
      ]);
      if (pair.error || blocks.error) return reply.code(500).send(notSaved);
      const row = pair.data as { id: string; requested_by: string; status: string } | null;
      friendshipId = row?.id ?? null;
      relation = ((blocks.data as unknown[] | null) ?? []).length > 0 ? 'blocked'
        : !row ? 'none' : row.status === 'accepted' ? 'friend' : row.requested_by === me ? 'pending_out' : 'pending_in';
    }

    const streaks = await supabase.from('streaks').select('current_streak, longest_streak').eq('user_id', target);
    if (streaks.error) return reply.code(500).send(notSaved);
    const rows = (streaks.data ?? []) as Array<{ current_streak: number; longest_streak: number }>;

    // All-time XP rank; a failed lookup only leaves it out, the profile still opens.
    let rank: { position: number; xp: number } | null = null;
    try {
      const ranked = await supabase.rpc('xp_rank_of', { p_user: target });
      const hit = ((ranked.data as Array<{ rank: number | string; xp: number | string }> | null) ?? [])[0];
      if (ranked.error) request.log.warn({ err: ranked.error }, 'XP rank lookup failed');
      else if (hit) rank = { position: Number(hit.rank), xp: Number(hit.xp) };
    } catch (err) {
      request.log.warn({ err }, 'XP rank lookup failed');
    }

    return reply.send({
      user_id: p.id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      cover_url: p.cover_url,
      role: p.role,
      grade: p.grade,
      school: isMe || p.show_school ? p.school : null,
      bio: isMe || p.show_bio ? p.bio : null,
      show_school: isMe ? p.show_school : null,
      show_bio: isMe ? p.show_bio : null,
      is_me: isMe,
      relation,
      friendship_id: friendshipId,
      streak: { current: Math.max(0, ...rows.map((r) => r.current_streak)), best: Math.max(0, ...rows.map((r) => r.longest_streak)) },
      rank,
    });
  });
};
