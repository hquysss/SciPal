import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { embedSrc, parseEmbedUrl, type EmbedProvider } from '../lessonVideos/embed.js';

// Lesson videos (spec 2026-10-19-lesson-videos-design). The backend decides who may watch: with the
// site switch on 'free' everyone, on 'plus' admins and Học sinh Plus. The playable address is only
// sent to a viewer who may use it.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'lesson-videos';
const SIGNED_SECONDS = 3600;
const msg = (error: string, error_en: string) => ({ error, error_en });
const FORBIDDEN = msg('Chỉ admin mới chỉnh video bài học.', 'Only admins change lesson videos.');
const UNAVAILABLE = msg('Chưa tải được video. Thử lại sau.', 'The video could not be loaded. Try again later.');
const NOT_FOUND = msg('Bài học chưa có video.', 'This lesson has no video.');
const BAD_EMBED = msg('Link video không hợp lệ. Hỗ trợ YouTube, Vimeo, Google Drive, Loom.', 'Invalid video link. YouTube, Vimeo, Google Drive and Loom are supported.');

type Mode = 'free' | 'plus';
type VideoRow = {
  source: 'file' | 'embed';
  video_path: string | null;
  embed_provider: EmbedProvider | null;
  embed_id: string | null;
  poster_path: string | null;
  duration_s: number | null;
  status: 'draft' | 'published';
};
type Actor = { id?: string; app_metadata?: { app_role?: string } };

const StatusBody = z.object({ status: z.enum(['draft', 'published']) }).strict();
const EmbedBody = z.object({ embedUrl: z.string().min(1).max(500) }).strict();
const AccessBody = z.object({ access: z.enum(['free', 'plus']) }).strict();

export const lessonVideoRoutes: FastifyPluginAsync = async (app) => {
  const actor = (request: FastifyRequest) => (request as FastifyRequest & { user?: Actor }).user;
  const isAdmin = (request: FastifyRequest) => actor(request)?.app_metadata?.app_role === 'admin';
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isAdmin(request)) return reply.code(403).send(FORBIDDEN);
  };

  const readMode = async (): Promise<Mode> => {
    const { data, error } = await app.supabase!.from('site_settings').select('lesson_videos_access').eq('id', 1).maybeSingle();
    if (error) throw error;
    return (data as { lesson_videos_access?: Mode } | null)?.lesson_videos_access === 'free' ? 'free' : 'plus';
  };

  /** Học sinh Plus with time left on the plan. */
  const hasPlus = async (userId: string): Promise<boolean> => {
    const { data, error } = await app.supabase!.from('billing_subscriptions').select('plan_code, paid_through').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    const sub = data as { plan_code: string; paid_through: string } | null;
    return !!sub && sub.plan_code === 'student_plus' && new Date(sub.paid_through) > new Date();
  };

  const sign = async (path: string | null): Promise<string | null> => {
    if (!path) return null;
    const { data, error } = await app.supabase!.storage.from(BUCKET).createSignedUrl(path, SIGNED_SECONDS);
    if (error) throw error;
    return data?.signedUrl ?? null;
  };

  app.get('/api/lessons/:id/video', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID.test(id)) return reply.code(404).send(NOT_FOUND);
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    try {
      const { data, error } = await app.supabase
        .from('lesson_videos')
        .select('source, video_path, embed_provider, embed_id, poster_path, duration_s, status')
        .eq('lesson_id', id)
        .maybeSingle();
      if (error) throw error;
      const row = data as VideoRow | null;
      const admin = isAdmin(request);
      // A draft is for admins only; to everyone else the lesson simply has no video.
      if (!row || (row.status !== 'published' && !admin)) return { available: false, admin };

      const mode = await readMode();
      const user = actor(request);
      const allowed = admin || mode === 'free' || (!!user?.id && (await hasPlus(user.id)));
      const poster = await sign(row.poster_path);
      const base = { available: true, admin, mode, locked: !allowed, status: row.status, durationSeconds: row.duration_s, poster };
      if (!allowed) return { ...base, playback: null };
      const playback = row.source === 'embed'
        ? { kind: 'embed' as const, url: embedSrc({ provider: row.embed_provider!, id: row.embed_id! }) }
        : { kind: 'file' as const, url: await sign(row.video_path) };
      return { ...base, playback };
    } catch (err) {
      request.log.error({ err }, 'Lesson video could not be read');
      return reply.code(503).send(UNAVAILABLE);
    }
  });

  // Embed a video from another app: only the provider and id of an allowlisted link are kept.
  app.post('/api/admin/lesson-videos/:lessonId/embed', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { lessonId } = request.params as { lessonId: string };
    const body = EmbedBody.safeParse(request.body);
    if (!UUID.test(lessonId) || !body.success) return reply.code(400).send(BAD_EMBED);
    const embed = parseEmbedUrl(body.data.embedUrl);
    if (!embed) return reply.code(400).send(BAD_EMBED);
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const { error } = await app.supabase.from('lesson_videos').upsert({
      lesson_id: lessonId,
      source: 'embed',
      embed_provider: embed.provider,
      embed_id: embed.id,
      video_path: null,
      poster_path: null,
      duration_s: null,
      status: 'draft',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'lesson_id' });
    if (error) {
      request.log.error({ err: error }, 'Lesson video embed was not saved');
      return reply.code(503).send(UNAVAILABLE);
    }
    return { ok: true, provider: embed.provider };
  });

  app.patch('/api/admin/lesson-videos/:lessonId', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { lessonId } = request.params as { lessonId: string };
    const body = StatusBody.safeParse(request.body);
    if (!UUID.test(lessonId) || !body.success) return reply.code(400).send(msg('Yêu cầu không hợp lệ.', 'Invalid request.'));
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const { data, error } = await app.supabase.from('lesson_videos').update({ status: body.data.status, updated_at: new Date().toISOString() }).eq('lesson_id', lessonId).select('lesson_id');
    if (error) {
      request.log.error({ err: error }, 'Lesson video status was not saved');
      return reply.code(503).send(UNAVAILABLE);
    }
    if (!Array.isArray(data) || data.length === 0) return reply.code(404).send(NOT_FOUND);
    return { ok: true, status: body.data.status };
  });

  app.get('/api/admin/lesson-videos-access', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    try {
      return { access: await readMode() };
    } catch (err) {
      request.log.error({ err }, 'Lesson video access could not be read');
      return reply.code(503).send(UNAVAILABLE);
    }
  });

  app.post('/api/admin/lesson-videos-access', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = AccessBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send(msg('Chế độ không hợp lệ.', 'Invalid mode.'));
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const { error } = await app.supabase.from('site_settings').update({ lesson_videos_access: body.data.access, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) {
      request.log.error({ err: error }, 'Lesson video access was not saved');
      return reply.code(503).send(UNAVAILABLE);
    }
    return { access: body.data.access };
  });
};
