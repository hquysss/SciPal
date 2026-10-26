import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { cronAuthorized } from '../internal/cron.js';
import { emailConfigured } from '../notify.js';
import { readToken } from '../newsletter/tokens.js';
import { runReminders } from '../reminders/reminders.js';

const userId = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id?: string } }).user?.id;
const unavailable = { error: 'Dịch vụ chưa sẵn sàng.', error_en: 'The service is not available.' };

type Body = { hour?: unknown; in_app?: unknown; email?: unknown };

/** Study reminder settings, the hourly job, and the e-mail unsubscribe link. */
export const reminderRoutes: FastifyPluginAsync = async (app) => {
  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!userId(request)) return reply.code(401).send({ error: 'Hãy đăng nhập.', error_en: 'Sign in first.' });
  };

  app.get('/api/me/reminders', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { data, error } = await app.supabase
      .from('profiles')
      .select('reminder_hour, reminder_in_app, reminder_email')
      .eq('id', userId(request)!)
      .maybeSingle();
    if (error) return reply.code(500).send({ error: 'Chưa tải được cài đặt nhắc học.', error_en: 'Could not load your reminder settings.' });
    const row = data as { reminder_hour: number | null; reminder_in_app: boolean; reminder_email: boolean } | null;
    return reply.send({
      hour: row?.reminder_hour ?? null,
      in_app: row?.reminder_in_app ?? true,
      email: row?.reminder_email ?? false,
      email_available: emailConfigured(),
    });
  });

  app.patch('/api/me/reminders', { preHandler: [requireUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as Body;
    const patch: Record<string, unknown> = {};
    if ('hour' in body) {
      const h = body.hour;
      if (h !== null && !(Number.isInteger(h) && (h as number) >= 0 && (h as number) <= 23)) {
        return reply.code(400).send({ error: 'Giờ nhắc phải từ 0 đến 23.', error_en: 'The reminder hour must be 0 to 23.' });
      }
      patch.reminder_hour = h;
    }
    for (const [key, column] of [['in_app', 'reminder_in_app'], ['email', 'reminder_email']] as const) {
      if (key in body) {
        if (typeof body[key] !== 'boolean') return reply.code(400).send({ error: 'Giá trị không hợp lệ.', error_en: 'That value is not valid.' });
        patch[column] = body[key];
      }
    }
    if (Object.keys(patch).length === 0) return reply.code(400).send({ error: 'Không có gì để lưu.', error_en: 'Nothing to save.' });
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { error } = await app.supabase.from('profiles').update(patch).eq('id', userId(request)!);
    if (error) return reply.code(500).send({ error: 'Chưa lưu được cài đặt.', error_en: 'Could not save the settings.' });
    return reply.send({ ok: true });
  });

  // Public: the e-mail link carries a signed token. The page calls it with POST so a mail scanner opening the link changes nothing.
  app.post('/api/reminders/unsubscribe', async (request, reply) => {
    const id = readToken('reminder-off', (request.body as { token?: unknown } | null)?.token);
    if (!id) return reply.code(400).send({ error: 'Liên kết không hợp lệ hoặc đã hết hạn.', error_en: 'This link is not valid or has expired.' });
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { error } = await app.supabase.from('profiles').update({ reminder_email: false }).eq('id', id);
    if (error) return reply.code(500).send({ error: 'Chưa tắt được email nhắc. Thử lại sau.', error_en: 'Could not turn the emails off. Try again later.' });
    return reply.send({ ok: true });
  });

  // Called every hour by cron-job.org with `Authorization: Bearer <CRON_SECRET>`.
  app.get('/api/internal/reminders/run', async (request, reply) => {
    if (!cronAuthorized(request.headers.authorization)) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    if (!app.supabase) return reply.code(503).send(unavailable);
    try {
      return reply.send(await runReminders(app.supabase, new Date(), app.log));
    } catch (err) {
      app.log.error({ err }, 'Study reminders failed');
      return reply.code(500).send({ error: 'Chưa chạy được nhắc học.', error_en: 'The reminder run failed.' });
    }
  });
};
