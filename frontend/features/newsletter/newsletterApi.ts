import { createBrowserClient } from '@/lib/supabase';
import { authoringCall, type ApiResult } from '../authoring/apiClient';

// Newsletter sign-up (anyone), its e-mail links (confirm, unsubscribe) and the admin's announcements.

type Bilingual = { vi: string; en: string };
export type NewsletterLevel = 'primary' | 'lower_secondary' | 'upper_secondary';
export const NEWSLETTER_LEVELS: Array<{ value: NewsletterLevel; label: Bilingual }> = [
  { value: 'primary', label: { vi: 'Tiểu học', en: 'Primary' } },
  { value: 'lower_secondary', label: { vi: 'THCS', en: 'Lower secondary' } },
  { value: 'upper_secondary', label: { vi: 'THPT', en: 'Upper secondary' } },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
const FAILED: Bilingual = { vi: 'Chưa đăng ký được. Thử lại sau ít phút.', en: 'Could not sign you up. Try again in a few minutes.' };

async function post(path: string, body: unknown, withSession = false): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: Bilingual }> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (withSession) {
    try {
      const { data } = await createBrowserClient().auth.getSession();
      if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
    } catch {
      // No session: the visitor confirms by e-mail.
    }
  }
  try {
    const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store' });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (response.ok) return { ok: true, data };
    return typeof data.error === 'string'
      ? { ok: false, error: { vi: data.error, en: typeof data.error_en === 'string' ? data.error_en : data.error } }
      : { ok: false, error: FAILED };
  } catch {
    return { ok: false, error: FAILED };
  }
}

/** The pages behind the links in the e-mails. */
export const sendNewsletterToken = (action: 'confirm' | 'unsubscribe', token: string) => post(`/api/newsletter/${action}`, { token });

export type Announcement = {
  id: string;
  title_vi: string;
  title_en: string;
  body_vi: string;
  body_en: string;
  link: string | null;
  level: NewsletterLevel | null;
  send_app: boolean;
  send_email: boolean;
  app_count: number;
  email_count: number;
  created_at: string;
};
export type AnnouncementAudience = {
  accounts: number;
  confirmed: number;
  pending: number;
  unsubscribed: number;
  confirmedByLevel: Record<NewsletterLevel, number>;
};
export type AnnouncementInput = {
  client_request_id: string;
  title_vi: string;
  title_en: string;
  body_vi: string;
  body_en: string;
  link: string;
  level: NewsletterLevel | '';
  send_app: boolean;
  send_email: boolean;
};

export const fetchAnnouncements = () =>
  authoringCall<{ announcements: Announcement[]; audience: AnnouncementAudience; emailReady: boolean }>('/api/admin/announcements', 'GET');
export const sendAnnouncement = (input: AnnouncementInput): Promise<ApiResult<{ announcement: Announcement; warning?: 'email_not_configured' | 'email_failed'; repeated?: boolean }>> =>
  authoringCall('/api/admin/announcements', 'POST', input);
