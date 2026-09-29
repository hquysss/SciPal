import { authoringCall, type ApiResult } from '../authoring/apiClient';

// Plan settings for admins (backend routes/adminPlans.ts). The server checks everything again.

type Bilingual = { vi: string; en: string };
type Kind = 'daily' | 'monthly' | 'capacity';

export type AdminPlan = {
  code: string;
  audience: string;
  name: Bilingual;
  description: Bilingual;
  version: number;
  limits: Array<{ metric: string; kind: Kind; limit: number }>;
  prices: { month: number | null; year: number | null } | null;
};
export type PlanAudit = { id: string; planCode: string; actorId: string | null; reason: string; before: unknown; after: unknown; createdAt: string };

export type PlanForm = {
  descriptionVi: string;
  descriptionEn: string;
  limits: Record<string, { kind: Kind; limit: string }>;
  month: string;
  year: string;
  reason: string;
};

export type PlanPatch = {
  expectedVersion: number;
  reason: string;
  limits: Array<{ metric: string; kind: Kind; limit: number }>;
  description: Bilingual;
  prices?: { month: number; year: number };
};

export const formFromPlan = (plan: AdminPlan): PlanForm => ({
  descriptionVi: plan.description.vi,
  descriptionEn: plan.description.en,
  limits: Object.fromEntries(plan.limits.map((l) => [l.metric, { kind: l.kind, limit: String(l.limit) }])),
  month: plan.prices?.month != null ? String(plan.prices.month) : '',
  year: plan.prices?.year != null ? String(plan.prices.year) : '',
  reason: '',
});

const wholeNumber = (text: string, min: number) => (/^\d+$/.test(text.trim()) && Number(text) >= min ? Number(text) : null);

/** The save request, or the first problem to show the admin. */
export function patchFromForm(form: PlanForm, plan: AdminPlan): { ok: true; body: PlanPatch } | { ok: false; error: Bilingual } {
  const reason = form.reason.trim();
  if (!reason) return { ok: false, error: { vi: 'Nhập lý do thay đổi.', en: 'Enter a reason for the change.' } };
  const descriptionVi = form.descriptionVi.trim();
  const descriptionEn = form.descriptionEn.trim();
  if (!descriptionVi || !descriptionEn) return { ok: false, error: { vi: 'Mô tả tiếng Việt và tiếng Anh không được để trống.', en: 'Both descriptions are required.' } };
  const limits: PlanPatch['limits'] = [];
  for (const l of plan.limits) {
    const row = form.limits[l.metric] ?? { kind: l.kind, limit: String(l.limit) };
    const limit = wholeNumber(row.limit, 0);
    if (limit === null) return { ok: false, error: { vi: 'Hạn mức phải là số nguyên từ 0.', en: 'Limits must be whole numbers from 0.' } };
    limits.push({ metric: l.metric, kind: row.kind, limit });
  }
  const body: PlanPatch = { expectedVersion: plan.version, reason, limits, description: { en: descriptionEn, vi: descriptionVi } };
  if (plan.prices) {
    const month = wholeNumber(form.month, 1000);
    const year = wholeNumber(form.year, 1000);
    if (month === null || year === null) return { ok: false, error: { vi: 'Giá phải là số nguyên từ 1.000 ₫.', en: 'Prices must be whole numbers from 1,000 VND.' } };
    body.prices = { month, year };
  }
  return { ok: true, body };
}

export const fetchAdminPlans = (): Promise<ApiResult<{ plans: AdminPlan[]; audit: PlanAudit[] }>> => authoringCall('/api/admin/plans', 'GET');
export const saveAdminPlan = (code: string, body: PlanPatch): Promise<ApiResult<{ version: number }>> =>
  authoringCall(`/api/admin/plans/${encodeURIComponent(code)}`, 'PATCH', body);
