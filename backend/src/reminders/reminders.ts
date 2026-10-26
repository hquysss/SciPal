import type { SupabaseClient } from '@supabase/supabase-js';
import { emailConfigured, escapeHtml, notifyUsers, sendEmails, webAppUrl, type Email } from '../notify.js';
import { makeToken } from '../newsletter/tokens.js';
import { currentStreak } from '../streaks/habit.js';
import { addDays, vnDay, vnHour } from '../streaks/vnDay.js';

// Study reminders: once an hour the cron claims the learners whose chosen Vietnam hour it is and who have not
// studied today (claim_study_reminders), then nudges them in the app and/or by e-mail. Best effort like notify.ts:
// a failed channel never blocks the other one.

type Log = { error: (obj: unknown, msg: string) => void };
type Claimed = { user_id: string; in_app: boolean; email: boolean };

const CLAIM_LIMIT = 500;
// ponytail: streaks are counted over the last 60 days, so a longer one shows as "60+"; one read returns <= 1000 rows, so 15 learners per read.
const STREAK_WINDOW = 60;
const READ_CHUNK = 15;
const MIN_STREAK = 2;

export type Reminder = { title: { en: string; vi: string }; link: string };

export function reminderFor(streak: number): Reminder {
  if (streak >= MIN_STREAK) {
    const n = streak >= STREAK_WINDOW ? `${STREAK_WINDOW}+` : String(streak);
    return {
      title: { vi: `Học hôm nay để giữ chuỗi ${n} ngày`, en: `Study today to keep your ${n}-day streak` },
      link: '/progress',
    };
  }
  return {
    title: { vi: 'Hôm nay bạn chưa học. Chỉ cần 5 phút!', en: "You haven't studied today. Five minutes is enough!" },
    link: '/progress',
  };
}

export function reminderEmail(to: string, reminder: Reminder, unsubscribe: string): Email {
  const open = `${webAppUrl()}${reminder.link}`;
  const link = (url: string) => `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`;
  return {
    to,
    subject: reminder.title.vi,
    html:
      `<p>${escapeHtml(reminder.title.vi)}</p><p>${link(open)}</p>` +
      `<p>${escapeHtml(reminder.title.en)}</p>` +
      `<p style="color:#666;font-size:12px">Tắt email nhắc học / Turn off study reminder emails: ${link(unsubscribe)}</p>`,
    headers: { 'List-Unsubscribe': `<${unsubscribe}>` },
  };
}

export const unsubscribeUrl = (userId: string): string | null => {
  const token = makeToken('reminder-off', userId);
  return token ? `${webAppUrl()}/reminders/unsubscribe?token=${encodeURIComponent(token)}` : null;
};

async function streaks(supabase: SupabaseClient, ids: string[], today: string): Promise<Map<string, number>> {
  const byUser = new Map<string, Array<{ day: string }>>();
  for (let i = 0; i < ids.length; i += READ_CHUNK) {
    const { data, error } = await supabase
      .from('study_days')
      .select('user_id, day')
      .in('user_id', ids.slice(i, i + READ_CHUNK))
      .gte('day', addDays(today, -STREAK_WINDOW));
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ user_id: string; day: string }>) {
      byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);
    }
  }
  return new Map(ids.map((id) => [id, currentStreak(byUser.get(id) ?? [], today)]));
}

export async function runReminders(supabase: SupabaseClient, now: Date, log: Log) {
  const today = vnDay(now);
  const { data, error } = await supabase.rpc('claim_study_reminders', { p_day: today, p_hour: vnHour(now), p_limit: CLAIM_LIMIT });
  if (error) throw error;
  const claimed = (data ?? []) as Claimed[];
  const summary = { claimed: claimed.length, in_app: 0, emailed: 0 };
  if (claimed.length === 0) return summary;

  let streakOf = new Map<string, number>();
  try {
    streakOf = await streaks(supabase, claimed.map((c) => c.user_id), today);
  } catch (err) {
    log.error({ err }, 'Could not read streaks for reminders'); // everyone gets the plain nudge
  }
  const reminderOf = (id: string) => reminderFor(streakOf.get(id) ?? 0);

  // In the app: one batch per distinct text.
  const groups = new Map<string, { reminder: Reminder; ids: string[] }>();
  for (const c of claimed.filter((c) => c.in_app)) {
    const reminder = reminderOf(c.user_id);
    const group = groups.get(reminder.title.vi) ?? { reminder, ids: [] };
    group.ids.push(c.user_id);
    groups.set(reminder.title.vi, group);
  }
  for (const { reminder, ids } of groups.values()) {
    await notifyUsers(supabase, ids, { kind: 'reminder', ...reminder }, log, { email: false });
    summary.in_app += ids.length;
  }

  // By e-mail, each with its own unsubscribe link.
  if (emailConfigured()) {
    try {
      const wanting = claimed.filter((c) => c.email);
      const users = await Promise.all(wanting.map((c) => supabase.auth.admin.getUserById(c.user_id)));
      const emails: Email[] = [];
      wanting.forEach((c, i) => {
        const to = users[i]?.data.user?.email;
        const unsubscribe = unsubscribeUrl(c.user_id);
        if (to && unsubscribe) emails.push(reminderEmail(to, reminderOf(c.user_id), unsubscribe));
      });
      if (emails.length > 0 && (await sendEmails(emails, log))) summary.emailed = emails.length;
    } catch (err) {
      log.error({ err }, 'Could not email study reminders');
    }
  }
  return summary;
}
