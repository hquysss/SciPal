import { z } from 'zod';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { clientIp, guestSecret, visitorHash } from '../guest/visitor.js';
import { WebsiteFeedbackInputSchema, WebsiteFeedbackSummarySchema, WebsiteReviewSchema } from '../schemas/websiteFeedback.js';
const TYPE = 'website_feedback';
const PAGE_SIZE = 10;
const PER_HOUR = 10;
const StoredContent = WebsiteFeedbackInputSchema.omit({ submission_id: true }).strip();
const failed = { error: 'Chưa lưu hoặc tải được đánh giá. Bạn thử lại sau nhé.', error_en: 'Could not save or load reviews. Please try again later.' };
type Caller = { id?: string; app_metadata?: { app_role?: string } };
const caller = (r: FastifyRequest) => (r as FastifyRequest & { user?: Caller }).user;
export async function saveWebsiteFeedback(app: FastifyInstance, request: FastifyRequest, reply: FastifyReply, payload: unknown) {
  const parsed = WebsiteFeedbackInputSchema.safeParse(payload);
  if (!parsed.success) return reply.code(400).send({ error: 'Chọn sao, độ dễ dùng và góp ý tối đa 500 ký tự.', error_en: 'Choose a rating, ease of use, and a comment of up to 500 characters.' });
  const db = app.supabase;
  if (!db) return reply.code(503).send(failed);
  const { submission_id, ...content } = parsed.data;
  const replay = async () => {
    const result = await db.from('surveys').select('payload').eq('id', submission_id).eq('type', TYPE).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;
    const row = z.object({ payload: StoredContent }).safeParse(result.data);
    return row.success && row.data.payload.rating === content.rating && row.data.payload.usability === content.usability && row.data.payload.feedback === content.feedback;
  };
  try {
    const existing = await replay();
    if (existing !== null) return reply.code(existing ? 201 : 409).send(existing ? { ok: true } : { error: 'Mã gửi đã được dùng cho nội dung khác.', error_en: 'This submission ID already belongs to different content.' });
    const user = caller(request);
    const backendKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const secret = guestSecret() ?? (backendKey ? visitorHash('website-feedback:visitors:v1', backendKey) : null);
    if (!user?.id && !secret) return reply.code(503).send(failed);
    const visitor = !user?.id && secret ? visitorHash(clientIp(request), secret) : null;
    let countQuery = db.from('surveys').select('id', { count: 'exact', head: true }).eq('type', TYPE).gte('created_at', new Date(Date.now() - 3600000).toISOString());
    countQuery = user?.id ? countQuery.eq('user_id', user.id) : countQuery.eq('payload->>visitor_hash', visitor);
    const recent = await countQuery;
    if (recent.error) throw recent.error;
    if ((recent.count ?? 0) >= PER_HOUR) return reply.code(429).send({ error: 'Bạn đã gửi nhiều đánh giá trong giờ qua. Thử lại sau nhé.', error_en: 'You have sent several reviews in the last hour. Please try again later.' });
    const result = await db.from('surveys').insert({ id: submission_id, user_id: user?.id ?? null, type: TYPE, payload: { ...content, visitor_hash: visitor } });
    if (result.error?.code === '23505') {
      if (await replay()) return reply.code(201).send({ ok: true });
      return reply.code(409).send({ error: 'Mã gửi đã được dùng.', error_en: 'This submission ID has already been used.' });
    }
    if (result.error) throw result.error;
    return reply.code(201).send({ ok: true });
  } catch (error) {
    request.log.error({ err: error }, 'Website feedback storage failed');
    return reply.code(503).send(failed);
  }
}
const Query = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) });
const Row = z.object({ id: WebsiteReviewSchema.shape.id, payload: StoredContent, created_at: WebsiteReviewSchema.shape.created_at });
const OwnerRow = Row.extend({ user_id: z.string().uuid().nullable() });
const Profiles = z.array(z.object({ id: z.string().uuid(), display_name: z.string().nullable() }));
async function listWebsiteFeedback(app: FastifyInstance, request: FastifyRequest, reply: FastifyReply, identities: boolean) {
  const query = Query.safeParse(request.query);
  if (!query.success) return reply.code(400).send({ error: 'Số trang không hợp lệ.', error_en: 'Invalid page number.' });
  const db = app.supabase;
  if (!db) return reply.code(503).send(failed);
  try {
    const stats = await db.rpc('website_feedback_summary');
    if (stats.error) throw stats.error;
    const summary = WebsiteFeedbackSummarySchema.parse(stats.data);
    const page = Math.min(query.data.page, Math.max(1, Math.ceil(summary.total / PAGE_SIZE)));
    const offset = (page - 1) * PAGE_SIZE;
    const result = await db.from('surveys').select(identities ? 'id,user_id,payload,created_at' : 'id,payload,created_at').eq('type', TYPE).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
    if (result.error) throw result.error;
    const rows = z.array(Row).parse(result.data ?? []);
    const names = new Map<string, string | null>();
    const owners = new Map<string, string | null>();
    if (identities) {
      z.array(OwnerRow).parse(result.data ?? []).forEach(r => owners.set(r.id, r.user_id));
      const ids = [...new Set([...owners.values()].filter((value): value is string => value !== null))];
      if (ids.length) {
        const profiles = await db.from('profiles').select('id,display_name').in('id', ids);
        if (profiles.error) throw profiles.error;
        Profiles.parse(profiles.data).forEach(p => names.set(p.id, p.display_name));
      }
    }
    const reviews = rows.map(r => {
      const sender = owners.get(r.id);
      return { id: r.id, ...r.payload, created_at: r.created_at,
        ...(identities ? { sender: sender ? { id: sender, name: names.get(sender) ?? null } : null } : {}) };
    });
    reply.header('Cache-Control', 'no-store');
    return reply.send({ ...summary, reviews, page, page_size: PAGE_SIZE });
  } catch (error) {
    request.log.error({ err: error }, 'Website feedback listing failed');
    return reply.code(503).send(failed);
  }
}
export const websiteFeedbackRoutes: FastifyPluginAsync = async app => {
  app.get('/api/survey/website', async (request, reply) => listWebsiteFeedback(app, request, reply, false));
  app.get('/api/admin/website-feedback', { preHandler: async (request, reply) => {
    if (caller(request)?.app_metadata?.app_role !== 'admin') return reply.code(403).send({ error: 'Chỉ admin xem được danh tính.', error_en: 'Only admins may view sender identities.' });
  } }, async (request, reply) => listWebsiteFeedback(app, request, reply, true));
};
