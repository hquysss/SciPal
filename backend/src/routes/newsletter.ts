import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { clientIp, guestSecret, visitorHash } from '../guest/visitor.js';
import { emailConfigured, escapeHtml, sendEmails, webAppUrl } from '../notify.js';
import { makeToken, readToken } from '../newsletter/tokens.js';

// Landing-page sign-up with double opt-in. Anyone may ask; only the owner of the address can
// confirm it, and every e-mail carries an unsubscribe link. Rows are read and written by this
// backend only. Answers never say whether an address is already known.

export const NEWSLETTER_LEVELS = ['primary', 'lower_secondary', 'upper_secondary'] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 320;
/** Different addresses one visitor may submit in an hour. */
const PER_HOUR = 5;
/** A pending address gets a new confirmation e-mail at most this often. */
const RESEND_AFTER_MS = 10 * 60 * 1000;

const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Đăng ký nhận tin chưa sẵn sàng.', 'Newsletter sign-up is not available yet.');
const failed = msg('Chưa đăng ký được. Thử lại sau ít phút.', 'Could not sign you up. Try again in a few minutes.');
const badToken = msg('Liên kết không hợp lệ hoặc đã hết hạn.', 'This link is not valid or has expired.');

type Caller = { id?: string; email?: string };
type Existing = { id: string; status: 'pending' | 'confirmed' | 'unsubscribed'; last_sent_at: string | null };

export const newsletterLink = (action: 'confirm' | 'unsubscribe', id: string) => {
  const token = makeToken(action, id);
  return token ? `${webAppUrl()}/newsletter/${action}?token=${encodeURIComponent(token)}` : null;
};

function confirmationEmail(to: string, locale: 'vi' | 'en', link: string) {
  const url = escapeHtml(link);
  return locale === 'vi'
    ? {
        to,
        subject: 'Xác nhận đăng ký nhận tin SciPal',
        html: `<p>Bạn vừa đăng ký nhận tin từ SciPal. Bấm liên kết để xác nhận:</p><p><a href="${url}">${url}</a></p><p>Nếu không phải bạn, cứ bỏ qua email này.</p>`,
      }
    : {
        to,
        subject: 'Confirm your SciPal newsletter sign-up',
        html: `<p>You signed up for SciPal news. Click to confirm:</p><p><a href="${url}">${url}</a></p><p>If this was not you, ignore this e-mail.</p>`,
      };
}

export const newsletterRoutes: FastifyPluginAsync = async (app) => {
  const caller = (request: FastifyRequest) => (request as FastifyRequest & { user?: Caller }).user;

  app.post('/api/newsletter/subscribe', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > MAX_EMAIL || !EMAIL.test(email)) {
      return reply.code(400).send(msg('Email không hợp lệ.', 'The e-mail is not valid.'));
    }
    const levels = Array.isArray(body.levels) ? [...new Set(body.levels)] : [];
    if (levels.length === 0 || !levels.every((l) => NEWSLETTER_LEVELS.some((known) => known === l))) {
      return reply.code(400).send(msg('Chọn ít nhất một cấp học.', 'Choose at least one school level.'));
    }
    const locale = body.locale === 'en' ? 'en' : 'vi';

    const secret = guestSecret();
    const supabase = app.supabase;
    const user = caller(request);
    // An account signing up with its own address has already proven it owns it.
    const verified = Boolean(user?.id && user.email && user.email.toLowerCase() === email);
    if (!secret || !supabase || (!verified && !emailConfigured())) return reply.code(503).send(unavailable);

    const visitor = visitorHash(clientIp(request), secret);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('visitor_hash', visitor)
      .gte('requested_at', since);
    if (countError) {
      request.log.error({ err: countError }, 'Failed to count recent newsletter sign-ups');
      return reply.code(500).send(failed);
    }
    if ((count ?? 0) >= PER_HOUR) {
      return reply.code(429).send(msg('Bạn đã đăng ký nhiều lần trong giờ qua. Thử lại sau nhé.', 'You signed up several times in the last hour. Try again later.'));
    }

    const { data: found, error: findError } = await supabase
      .from('newsletter_subscribers')
      .select('id, status, last_sent_at')
      .eq('email', email)
      .maybeSingle();
    if (findError) {
      request.log.error({ err: findError }, 'Failed to look up a newsletter subscriber');
      return reply.code(500).send(failed);
    }
    const existing = found as Existing | null;
    const now = new Date().toISOString();
    const accepted = (confirmed: boolean) => reply.code(202).send({ ok: true, confirmed });

    // Already on the list, or asked a moment ago: nothing to change and nothing to reveal.
    if (existing?.status === 'confirmed') return accepted(false);
    const recentlySent = existing?.last_sent_at && Date.now() - new Date(existing.last_sent_at).getTime() < RESEND_AFTER_MS;
    if (existing?.status === 'pending' && recentlySent && !verified) return accepted(false);

    const fields = {
      user_id: user?.id ?? null,
      levels,
      locale,
      visitor_hash: visitor,
      requested_at: now,
      unsubscribed_at: null,
      ...(verified ? { status: 'confirmed', confirmed_at: now } : { status: 'pending', last_sent_at: now }),
    };
    const saved = existing
      ? await supabase.from('newsletter_subscribers').update(fields).eq('id', existing.id).select('id').single()
      : await supabase.from('newsletter_subscribers').insert({ email, ...fields }).select('id').single();
    if (saved.error || !saved.data) {
      request.log.error({ err: saved.error }, 'Failed to store a newsletter subscriber');
      return reply.code(500).send(failed);
    }
    if (verified) return accepted(true);

    const link = newsletterLink('confirm', (saved.data as { id: string }).id);
    if (!link || !(await sendEmails([confirmationEmail(email, locale, link)], request.log))) {
      return reply.code(503).send(unavailable);
    }
    return accepted(false);
  });

  // The pages call these with POST so a mail scanner that opens the link cannot confirm or unsubscribe.
  const act = (action: 'confirm' | 'unsubscribe') => async (request: FastifyRequest, reply: FastifyReply) => {
    const id = readToken(action, ((request.body ?? {}) as { token?: unknown }).token);
    if (!id) return reply.code(400).send(badToken);
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const now = new Date().toISOString();
    const table = supabase.from('newsletter_subscribers');
    const { error } = action === 'confirm'
      ? await table.update({ status: 'confirmed', confirmed_at: now, unsubscribed_at: null }).eq('id', id).eq('status', 'pending')
      : await table.update({ status: 'unsubscribed', unsubscribed_at: now }).eq('id', id);
    if (error) {
      request.log.error({ err: error }, `Failed to ${action} a newsletter subscriber`);
      return reply.code(500).send(failed);
    }
    return reply.send({ ok: true });
  };
  app.post('/api/newsletter/confirm', act('confirm'));
  app.post('/api/newsletter/unsubscribe', act('unsubscribe'));
};
