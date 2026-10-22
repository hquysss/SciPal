import { authoringCall, queryString } from '../authoring/apiClient';

// Highland / hardship support (backend/src/routes/supportAccess.ts): an account sends an application
// or redeems a code; an admin decides applications and hands out codes.

export type SupportStatus = 'pending' | 'approved' | 'rejected';
export type SupportPlan = 'student_plus' | 'teacher_pro';

export type MyApplication = {
  application: { id: string; role: 'student' | 'teacher'; status: SupportStatus; decisionNote: string | null; grantedMonths: number | null; decidedAt: string | null; createdAt: string } | null;
  plan: { planCode: string; paidThrough: string | null } | null;
};

export const getMyApplication = () => authoringCall<MyApplication>('/api/support/applications/mine', 'GET');
export const sendApplication = (input: { fullName: string; school: string; area: string; reason: string }) =>
  authoringCall<{ id: string }>('/api/support/applications', 'POST', input);
export const redeemCode = (code: string) => authoringCall<{ planCode: string; paidThrough: string | null }>('/api/billing/codes/redeem', 'POST', { code });

export type AdminApplication = {
  id: string; userId: string; role: 'student' | 'teacher'; fullName: string; school: string; area: string; reason: string;
  status: SupportStatus; decisionNote: string | null; grantedMonths: number | null; decidedAt: string | null; createdAt: string;
};
export const listApplications = (status?: SupportStatus) =>
  authoringCall<{ applications: AdminApplication[] }>(`/api/admin/support/applications${queryString({ status })}`, 'GET');
export const decideApplication = (id: string, decision: { approve: true; months: number } | { approve: false; note: string }) =>
  authoringCall<{ status: SupportStatus; paidThrough?: string | null }>(`/api/admin/support/applications/${id}/decision`, 'POST', decision);

export type AdminCode = {
  id: string; hint: string; planCode: SupportPlan; months: number; maxUses: number; uses: number;
  expiresAt: string | null; note: string | null; revokedAt: string | null; createdAt: string;
};
export const listCodes = () => authoringCall<{ codes: AdminCode[] }>('/api/admin/billing/codes', 'GET');
export const createCode = (input: { planCode: SupportPlan; code?: string; months: number; maxUses: number; expiresAt?: string; note?: string }) =>
  authoringCall<{ id: string; code: string; display: string }>('/api/admin/billing/codes', 'POST', input);
export const revokeCode = (id: string) => authoringCall<{ revoked: true }>(`/api/admin/billing/codes/${id}/revoke`, 'POST', {});

/** A date as the reader writes it in Vietnam. */
export const dayText = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '');
