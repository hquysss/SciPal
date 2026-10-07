import type { SupabaseClient } from '@supabase/supabase-js';

// In-app notifications plus an email through Resend (https://resend.com/docs/api-reference/emails/send-batch-emails).
// Email is best effort: without RESEND_API_KEY / EMAIL_FROM it is skipped, and a failed send never
// fails the request that caused it — the bell still has the notification.

export type Notice = { kind: string; title: { en: string; vi: string }; link: string };

const RESEND_BATCH = 100;
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function notifyUsers(
  supabase: SupabaseClient,
  userIds: string[],
  notice: Notice,
  log: { error: (obj: unknown, msg: string) => void },
): Promise<void> {
  if (userIds.length === 0) return;
  const { error } = await supabase.from('notifications').insert(
    userIds.map((user_id) => ({ user_id, kind: notice.kind, title_en: notice.title.en, title_vi: notice.title.vi, link: notice.link })),
  );
  if (error) log.error({ err: error }, 'Could not store notifications');

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return;
  try {
    const users = await Promise.all(userIds.map((id) => supabase.auth.admin.getUserById(id)));
    const emails = users.map((u) => u.data.user?.email).filter((e): e is string => Boolean(e));
    const site = (process.env.WEB_APP_URL ?? 'https://scipal.vercel.app').replace(/\/$/, '');
    const url = `${site}${notice.link}`;
    const html = `<p>${escapeHtml(notice.title.vi)}</p><p>${escapeHtml(notice.title.en)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`;
    for (let i = 0; i < emails.length; i += RESEND_BATCH) {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emails.slice(i, i + RESEND_BATCH).map((to) => ({ from, to, subject: notice.title.vi, html }))),
      });
      if (!res.ok) log.error({ status: res.status, body: await res.text().catch(() => '') }, 'Resend batch failed');
    }
  } catch (err) {
    log.error({ err }, 'Could not email notifications');
  }
}
