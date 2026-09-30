import { authoringCall, type ApiResult } from '../authoring/apiClient';

// Plan settings for admins (backend routes/adminPlans.ts). The server checks everything again.

type Bilingual = { vi: string; en: string };
type Kind = 'daily' | 'monthly' | 'capacity';

export type AdminPlan = {
  code: string;
  audience: string;
  name: Bilingual;
  description: Bilingual;
  perks: Bilingual[];
  version: number;
  limits: Array<{ metric: string; kind: Kind; limit: number }>;
  prices: { month: number | null; year: number | null } | null;
};
export type PlanAudit = { id: string; planCode: string; actorId: string | null; reason: string; before: unknown; after: unknown; createdAt: string };

export type PlanForm = {
  descriptionVi: string;
  descriptionEn: string;
  /** One benefit per line; line n of each language is the same benefit. */
  perksVi: string;
  perksEn: string;
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
  perks: Bilingual[];
  prices?: { month: number; year: number };
};

export const formFromPlan = (plan: AdminPlan): PlanForm => ({
  descriptionVi: plan.description.vi,
  descriptionEn: plan.description.en,
  perksVi: plan.perks.map((p) => p.vi).join('\n'),
  perksEn: plan.perks.map((p) => p.en).join('\n'),
  limits: Object.fromEntries(plan.limits.map((l) => [l.metric, { kind: l.kind, limit: String(l.limit) }])),
  month: plan.prices?.month != null ? String(plan.prices.month) : '',
  year: plan.prices?.year != null ? String(plan.prices.year) : '',
  reason: '',
});

export const MAX_PERKS = 8;
export const MAX_PERK_CHARS = 120;

const wholeNumber = (text: string, min: number) => (/^\d+$/.test(text.trim()) && Number(text) >= min ? Number(text) : null);

/** The save request, or the first problem to show the admin. */
export function patchFromForm(form: PlanForm, plan: AdminPlan): { ok: true; body: PlanPatch } | { ok: false; error: Bilingual } {
  const reason = form.reason.trim();
  if (!reason) return { ok: false, error: { vi: 'Nhập lý do thay đổi.', en: 'Enter a reason for the change.' } };
  const descriptionVi = form.descriptionVi.trim();
  const descriptionEn = form.descriptionEn.trim();
  if (!descriptionVi || !descriptionEn) return { ok: false, error: { vi: 'Mô tả tiếng Việt và tiếng Anh không được để trống.', en: 'Both descriptions are required.' } };
  const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);
  const perksVi = lines(form.perksVi);
  const perksEn = lines(form.perksEn);
  if (perksVi.length !== perksEn.length) return { ok: false, error: { vi: 'Quyền lợi tiếng Việt và tiếng Anh phải có cùng số dòng.', en: 'The Vietnamese and English benefits need the same number of lines.' } };
  if (perksVi.length > MAX_PERKS) return { ok: false, error: { vi: `Tối đa ${MAX_PERKS} quyền lợi.`, en: `At most ${MAX_PERKS} benefits.` } };
  if ([...perksVi, ...perksEn].some((l) => l.length > MAX_PERK_CHARS)) return { ok: false, error: { vi: `Mỗi quyền lợi tối đa ${MAX_PERK_CHARS} ký tự.`, en: `Each benefit is at most ${MAX_PERK_CHARS} characters.` } };
  const perks = perksVi.map((vi, i) => ({ vi, en: perksEn[i] }));
  const limits: PlanPatch['limits'] = [];
  for (const l of plan.limits) {
    const row = form.limits[l.metric] ?? { kind: l.kind, limit: String(l.limit) };
    const limit = wholeNumber(row.limit, 0);
    if (limit === null) return { ok: false, error: { vi: 'Hạn mức phải là số nguyên từ 0.', en: 'Limits must be whole numbers from 0.' } };
    limits.push({ metric: l.metric, kind: row.kind, limit });
  }
  const body: PlanPatch = { expectedVersion: plan.version, reason, limits, description: { en: descriptionEn, vi: descriptionVi }, perks };
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
