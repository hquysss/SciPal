import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { emailConfigured, escapeHtml, sendEmails, webAppUrl, type Email } from '../notify.js';
import { newsletterLink, NEWSLETTER_LEVELS } from './newsletter.js';

// An admin writes one announcement. It reaches every account through the bell (notifications) and/or
// the confirmed newsletter subscribers by e-mail. Accounts that never subscribed get no e-mail.
// The announcements row is written first, keyed by the client's request id, so a retry or a double
// click cannot send twice. The level filter narrows the e-mail only.

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 1000;
const COLUMNS = 'id, title_vi, title_en, body_vi, body_en, link, level, tone, send_app, send_email, app_count, email_count, created_at';
const LIST_LIMIT = 50;

const msg = (error: string, error_en: string) => ({ error, error_en });
const FORBIDDEN = msg('Chỉ admin mới gửi thông báo.', 'Only admins send announcements.');
const unavailable = msg('Chưa đọc hoặc gửi được thông báo. Thử lại sau.', 'Announcements could not be read or sent. Try again later.');
const INVALID = msg(
  'Tiêu đề tiếng Việt và tiếng Anh 1–120 ký tự, nội dung tối đa 1000 ký tự, chọn ít nhất một kênh gửi, người nhận là mọi tài khoản, ít nhất một vai trò hoặc 1–200 tài khoản, liên kết là đường dẫn trong SciPal (bắt đầu bằng /) hoặc https.',
  'Titles in Vietnamese and English are 1–120 characters, the text up to 1000, pick at least one channel, send to all accounts, at least one role or 1–200 accounts, and the link is a SciPal path (starting with /) or https.',
);

export const TONES = ['info', 'good', 'warn', 'urgent'] as const;
export type Tone = (typeof TONES)[number];
/** The e-mail band: a dark enough fill for white text, and the label said in words so colour is never the only cue. */
const TONE_BAND: Record<Tone, { color: string; vi: string; en: string }> = {
  info: { color: '#1d4ed8', vi: 'Thông tin', en: 'Info' },
  good: { color: '#15803d', vi: 'Tin vui', en: 'Good news' },
  warn: { color: '#a16207', vi: 'Lưu ý', en: 'Heads up' },
  urgent: { color: '#b91c1c', vi: 'Khẩn', en: 'Urgent' },
};
/** What a bell notice's `kind` is for a tone: the plain `announcement` stays the info look. */
export const noticeKind = (tone: Tone) => (tone === 'info' ? 'announcement' : `announcement:${tone}`);

const ROLES = ['student', 'teacher', 'admin'] as const;
const MAX_PICKED = 200;
type Audience = { mode: 'all' } | { mode: 'role'; roles: string[] } | { mode: 'users'; ids: string[] };

/** The in-app audience from the request: everyone (the default), some roles, or named accounts. */
function readAudience(value: unknown): Audience | null {
  if (value === undefined || value === null) return { mode: 'all' };
  const raw = value as { mode?: unknown; roles?: unknown; user_ids?: unknown };
  if (raw.mode === 'all') return { mode: 'all' };
  if (raw.mode === 'role') {
    const roles = Array.isArray(raw.roles) ? [...new Set(raw.roles)] : [];
    return roles.length > 0 && roles.every((r) => ROLES.some((known) => known === r)) ? { mode: 'role', roles: roles as string[] } : null;
  }
  if (raw.mode === 'users') {
    const ids = Array.isArray(raw.user_ids) ? [...new Set(raw.user_ids)] : [];
    return ids.length > 0 && ids.length <= MAX_PICKED && ids.every((id) => typeof id === 'string' && ID.test(id)) ? { mode: 'users', ids: ids as string[] } : null;
  }
  return null;
}

type Row = {
  id: string; title_vi: string; title_en: string; body_vi: string; body_en: string; link: string | null; level: string | null; tone: Tone;
  send_app: boolean; send_email: boolean; app_count: number; email_count: number; created_at: string;
};
type Subscriber = { id: string; email: string; locale: 'vi' | 'en'; levels: string[] };

const text = (value: unknown, max: number, min = 0) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max ? trimmed : null;
};

function safeLink(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 300) return undefined;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try {
    return new URL(value).protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

function announcementEmail(row: Row, subscriber: Subscriber, unsubscribe: string | null): Email {
  const href = row.link ? (row.link.startsWith('/') ? `${webAppUrl()}${row.link}` : row.link) : webAppUrl();
  const paragraphs = (value: string) => value.split(/\n+/).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  const block = (title: string, body: string) => `<h2>${escapeHtml(title)}</h2>${paragraphs(body)}`;
  const first = subscriber.locale === 'en'
    ? block(row.title_en, row.body_en) + block(row.title_vi, row.body_vi)
    : block(row.title_vi, row.body_vi) + block(row.title_en, row.body_en);
  const foot = unsubscribe
    ? `<hr><p><small>${subscriber.locale === 'en' ? 'Stop receiving these e-mails' : 'Ngừng nhận email này'}: <a href="${escapeHtml(unsubscribe)}">${escapeHtml(unsubscribe)}</a></small></p>`
    : '';
  const band = TONE_BAND[row.tone] ?? TONE_BAND.info;
  const tag = `<p style="margin:0 0 12px;padding:6px 12px;background:${band.color};color:#ffffff;font-weight:700;border-radius:6px">${subscriber.locale === 'en' ? band.en : band.vi}</p>`;
  return {
    to: subscriber.email,
    subject: subscriber.locale === 'en' ? row.title_en : row.title_vi,
    html: `${tag}${first}<p><a href="${escapeHtml(href)}">${escapeHtml(href)}</a></p>${foot}`,
    ...(unsubscribe ? { headers: { 'List-Unsubscribe': `<${unsubscribe}>` } } : {}),
  };
}

type Log = { error: (obj: unknown, msg: string) => void };

/** Accounts that have a profile (the notifications table points at it), out of `ids`, in batches. */
async function withProfile(supabase: NonNullable<FastifyInstance['supabase']>, ids: string[], log: Log): Promise<string[]> {
  const found: string[] = [];
  for (let from = 0; from < ids.length; from += 300) {
    const { data, error } = await supabase.from('profiles').select('id').in('id', ids.slice(from, from + 300));
    if (error) log.error({ err: error }, 'Failed to read accounts for an announcement');
    else found.push(...((data ?? []) as Array<{ id: string }>).map((p) => p.id));
  }
  return found;
}

async function recipientIds(supabase: NonNullable<FastifyInstance['supabase']>, audience: Audience, log: Log): Promise<string[]> {
  if (audience.mode === 'users') return withProfile(supabase, audience.ids, log);
  if (audience.mode === 'role') {
    // The role lives in the sign-in service, so read its users page by page.
    const ids: string[] = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE });
      if (error) {
        log.error({ err: error }, 'Failed to list accounts for an announcement');
        return [];
      }
      for (const user of data.users) if (audience.roles.includes(user.app_metadata?.app_role ?? 'student')) ids.push(user.id);
      if (data.users.length < PAGE) break;
    }
    return withProfile(supabase, ids, log);
  }
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('profiles').select('id').order('id').range(from, from + PAGE - 1);
    if (error) {
      log.error({ err: error }, 'Failed to read accounts for an announcement');
      break;
    }
    const page = (data ?? []) as Array<{ id: string }>;
    ids.push(...page.map((p) => p.id));
    if (page.length < PAGE) break;
  }
  return ids;
}

export type AnnouncementInput = {
  requestId: string; titleVi: string; titleEn: string; bodyVi: string; bodyEn: string; link: string | null;
  level: (typeof NEWSLETTER_LEVELS)[number] | null; tone: Tone; audience: Audience; sendApp: boolean; sendEmail: boolean;
};

/** An announcement from a request body (or a scheduled payload); null when any field is invalid. A scheduled one passes its own request id. */
export function parseAnnouncement(raw: unknown, fallbackRequestId?: string): AnnouncementInput | null {
  const body = (raw ?? {}) as Record<string, unknown>;
  const requestId = typeof body.client_request_id === 'string' && ID.test(body.client_request_id) ? body.client_request_id : fallbackRequestId ?? null;
  const titleVi = text(body.title_vi, 120, 1);
  const titleEn = text(body.title_en, 120, 1);
  const bodyVi = text(body.body_vi ?? '', 1000);
  const bodyEn = text(body.body_en ?? '', 1000);
  const link = safeLink(body.link);
  const level = body.level === undefined || body.level === null || body.level === '' ? null : NEWSLETTER_LEVELS.find((l) => l === body.level);
  const audience = readAudience(body.audience);
  const tone = body.tone === undefined || body.tone === null || body.tone === '' ? 'info' : TONES.find((x) => x === body.tone);
  const sendApp = body.send_app === true;
  const sendEmail = body.send_email === true;
  if (!requestId || !titleVi || !titleEn || bodyVi === null || bodyEn === null || link === undefined || level === undefined || tone === undefined || audience === null || (!sendApp && !sendEmail)) return null;
  return { requestId, titleVi, titleEn, bodyVi, bodyEn, link, level, tone, audience, sendApp, sendEmail };
}

/** Stores the announcement, writes its bell notices and sends its e-mail. Null when it could not even be stored. */
export async function deliverAnnouncement(
  supabase: NonNullable<FastifyInstance['supabase']>,
  log: Log,
  createdBy: string | null,
  input: AnnouncementInput,
): Promise<{ announcement: Row; warning?: 'email_not_configured' | 'email_failed' } | null> {
  const { titleVi, titleEn, link, level, tone, audience, sendApp, sendEmail } = input;
  const created = await supabase
    .from('announcements')
    .insert({
      client_request_id: input.requestId, created_by: createdBy,
      title_vi: titleVi, title_en: titleEn, body_vi: input.bodyVi, body_en: input.bodyEn, link, level, tone,
      send_app: sendApp, send_email: sendEmail,
    })
    .select(COLUMNS)
    .single();
  if (created.error || !created.data) {
    log.error({ err: created.error }, 'Failed to store an announcement');
    return null;
  }
  const row = created.data as Row;

  let appCount = 0;
  if (sendApp) {
    const ids = await recipientIds(supabase, audience, log);
    for (let from = 0; from < ids.length; from += PAGE) {
      const chunk = ids.slice(from, from + PAGE);
      const { error: insertError } = await supabase.from('notifications').insert(
        chunk.map((id) => ({ user_id: id, kind: noticeKind(tone), title_en: titleEn, title_vi: titleVi, link: link ?? '/' })),
      );
      if (insertError) log.error({ err: insertError }, 'Failed to store announcement notifications');
      else appCount += chunk.length;
    }
  }

  let emailCount = 0;
  let warning: 'email_not_configured' | 'email_failed' | undefined;
  if (sendEmail) {
    if (!emailConfigured()) warning = 'email_not_configured';
    else {
      const { data, error } = await supabase.from('newsletter_subscribers').select('id, email, locale, levels').eq('status', 'confirmed');
      if (error) {
        log.error({ err: error }, 'Failed to read subscribers for an announcement');
        warning = 'email_failed';
      } else {
        const subscribers = ((data ?? []) as Subscriber[]).filter((s) => !level || s.levels.includes(level));
        const emails = subscribers.map((s) => announcementEmail(row, s, newsletterLink('unsubscribe', s.id)));
        if (await sendEmails(emails, log)) emailCount = emails.length;
        else warning = 'email_failed';
      }
    }
  }

  const done = await supabase.from('announcements').update({ app_count: appCount, email_count: emailCount }).eq('id', row.id);
  if (done.error) log.error({ err: done.error }, 'Failed to store announcement counts');
  return { announcement: { ...row, app_count: appCount, email_count: emailCount }, ...(warning ? { warning } : {}) };
}

export const adminAnnouncementRoutes: FastifyPluginAsync = async (app) => {
  const caller = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id?: string; app_metadata?: { app_role?: string } } }).user;
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (caller(request)?.app_metadata?.app_role !== 'admin') return reply.code(403).send(FORBIDDEN);
  };

  app.get('/api/admin/announcements', { preHandler: [requireAdmin] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const [announcements, subscribers, accounts] = await Promise.all([
      supabase.from('announcements').select(COLUMNS).order('created_at', { ascending: false }).limit(LIST_LIMIT),
      supabase.from('newsletter_subscribers').select('status, levels'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);
    const failure = announcements.error ?? subscribers.error ?? accounts.error;
    if (failure) {
      request.log.error({ err: failure }, 'Failed to read announcements');
      return reply.code(500).send(unavailable);
    }
    const rows = (subscribers.data ?? []) as Array<{ status: string; levels: string[] }>;
    const confirmed = rows.filter((s) => s.status === 'confirmed');
    return reply.send({
      announcements: announcements.data ?? [],
      audience: {
        accounts: accounts.count ?? 0,
        confirmed: confirmed.length,
        pending: rows.filter((s) => s.status === 'pending').length,
        unsubscribed: rows.filter((s) => s.status === 'unsubscribed').length,
        confirmedByLevel: Object.fromEntries(NEWSLETTER_LEVELS.map((level) => [level, confirmed.filter((s) => s.levels.includes(level)).length])),
      },
      emailReady: emailConfigured(),
    });
  });

  app.post('/api/admin/announcements', { preHandler: [requireAdmin] }, async (request, reply) => {
    const input = parseAnnouncement(request.body);
    if (!input) return reply.code(400).send(INVALID);
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);

    const earlier = await supabase.from('announcements').select(COLUMNS).eq('client_request_id', input.requestId).maybeSingle();
    if (earlier.error) {
      request.log.error({ err: earlier.error }, 'Failed to look up an announcement');
      return reply.code(500).send(unavailable);
    }
    if (earlier.data) return reply.send({ announcement: earlier.data, repeated: true });

    const sent = await deliverAnnouncement(supabase, request.log, caller(request)?.id ?? null, input);
    if (!sent) return reply.code(500).send(unavailable);
    return reply.code(201).send({ announcement: sent.announcement, ...(sent.warning ? { warning: sent.warning } : {}) });
  });

  // Take an announcement back: its notices leave every bell and the row leaves the history.
  // Notices carry no announcement id, so they are matched by kind, titles and the minutes after sending.
  // E-mails already sent cannot be recalled.
  app.delete('/api/admin/announcements/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return reply.code(400).send(INVALID);
    const found = await supabase.from('announcements').select(COLUMNS).eq('id', id).maybeSingle();
    if (found.error) {
      request.log.error({ err: found.error }, 'Failed to look up an announcement');
      return reply.code(500).send(unavailable);
    }
    const row = found.data as Row | null;
    if (!row) return reply.code(404).send(msg('Không tìm thấy thông báo.', 'Announcement not found.'));
    if (row.send_app) {
      const from = new Date(row.created_at);
      const until = new Date(from.getTime() + 10 * 60 * 1000);
      const removed = await supabase.from('notifications').delete()
        .in('kind', TONES.map(noticeKind)).eq('title_en', row.title_en).eq('title_vi', row.title_vi)
        .gte('created_at', from.toISOString()).lte('created_at', until.toISOString());
      if (removed.error) {
        request.log.error({ err: removed.error }, 'Failed to remove announcement notifications');
        return reply.code(500).send(unavailable);
      }
    }
    const gone = await supabase.from('announcements').delete().eq('id', id);
    if (gone.error) {
      request.log.error({ err: gone.error }, 'Failed to delete an announcement');
      return reply.code(500).send(unavailable);
    }
    return reply.code(204).send();
  });
};
