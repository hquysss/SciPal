import { apiFetch } from '@/features/admin/accountsApi';
import { createBrowserClient } from '@/lib/supabase';

// Reporting a problem (anyone: landing footer, profile) and reading the reports (admin).

export type ProblemCategory = 'bug' | 'content' | 'payment' | 'account' | 'other';
type Bilingual = { vi: string; en: string };

export const CATEGORY_LABEL: Record<ProblemCategory, Bilingual> = {
  bug: { vi: 'Trang web bị lỗi', en: 'Something is broken' },
  content: { vi: 'Nội dung bài học sai', en: 'Wrong lesson content' },
  payment: { vi: 'Thanh toán', en: 'Payment' },
  account: { vi: 'Tài khoản, đăng nhập', en: 'Account or sign-in' },
  other: { vi: 'Vấn đề khác', en: 'Something else' },
};

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;

export interface ProblemReportInput {
  category: ProblemCategory;
  message: string;
  email?: string;
  page_url?: string;
}

export interface ProblemReport {
  id: string;
  user_id: string | null;
  email: string | null;
  category: ProblemCategory;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  status: 'open' | 'resolved';
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
const FAILED: Bilingual = { vi: 'Chưa gửi được báo cáo. Thử lại sau ít phút.', en: 'Could not send the report. Try again in a few minutes.' };

/** Whether someone is signed in (a visitor may add an e-mail to be answered). */
export async function isSignedIn(): Promise<boolean> {
  try {
    const { data } = await createBrowserClient().auth.getSession();
    return Boolean(data.session);
  } catch {
    return false;
  }
}

/** Sends a report with the session when there is one; visitors send it without. */
export async function sendProblemReport(input: ProblemReportInput): Promise<{ ok: true } | { ok: false; error: Bilingual }> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  try {
    const { data } = await createBrowserClient().auth.getSession();
    if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  } catch {
    // No session: send as a visitor.
  }
  try {
    const response = await fetch(`${API_BASE}/api/problem-reports`, { method: 'POST', headers, body: JSON.stringify(input), cache: 'no-store' });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => null)) as { error?: unknown; error_en?: unknown } | null;
    return typeof body?.error === 'string'
      ? { ok: false, error: { vi: body.error, en: typeof body.error_en === 'string' ? body.error_en : body.error } }
      : { ok: false, error: FAILED };
  } catch {
    return { ok: false, error: FAILED };
  }
}

export const listProblemReports = () => apiFetch<{ reports: ProblemReport[] }>('/api/admin/problem-reports').then((r) => r.reports);

export const resolveProblemReport = (id: string) =>
  apiFetch<{ report: ProblemReport }>(`/api/admin/problem-reports/${encodeURIComponent(id)}/resolve`, { method: 'POST', body: '{}' });
