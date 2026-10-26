import { getAccessToken } from '../../lib/session';

// Study reminder settings (backend GET/PATCH /api/me/reminders) and the e-mail unsubscribe link.

export type Reminders = { hour: number | null; in_app: boolean; email: boolean; email_available: boolean };
export type RemindersPatch = Partial<Pick<Reminders, 'hour' | 'in_app' | 'email'>>;

export const DEFAULT_REMINDER_HOUR = 20;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

/** null for guests or when the server cannot answer: the settings row stays hidden. */
export async function getReminders(): Promise<Reminders | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/me/reminders`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as Reminders;
    return typeof data?.in_app === 'boolean' ? data : null;
  } catch {
    return null;
  }
}

export async function saveReminders(patch: RemindersPatch): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/api/me/reminders`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** The page behind the unsubscribe link in a reminder e-mail. */
export async function unsubscribeReminderEmail(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/reminders/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}
