import type { QuotaMetric } from '@scipal/types';
import type { AccountQuota, AccountQuotaSnapshot, QuotaChangeInput } from './quotasApi';

// The quota dialog's editable rows and the PATCH they turn into. Times are entered in Vietnam time.

type Bilingual = { vi: string; en: string };
export type QuotaRow = { metric: QuotaMetric; mode: 'plan' | 'custom'; limit: string; expires: string };

export const METRIC_LABEL: Record<QuotaMetric, Bilingual> = {
  tutor_requests: { vi: 'Lượt Tutor mỗi tháng', en: 'Tutor requests a month' },
  graded_exam_attempts: { vi: 'Lượt thi chấm điểm mỗi tháng', en: 'Graded exam attempts a month' },
  import_files: { vi: 'Tệp nhập mỗi tháng', en: 'Imported files a month' },
  author_ai_requests: { vi: 'Lượt AI soạn bài mỗi tháng', en: 'Authoring AI requests a month' },
  active_classes: { vi: 'Lớp đang hoạt động', en: 'Active classes' },
  students_per_class: { vi: 'Học sinh mỗi lớp', en: 'Students per class' },
  active_authored_exams: { vi: 'Đề tự soạn đang hoạt động', en: 'Active authored exams' },
};

export const PLAN_LABEL: Record<string, Bilingual> = {
  student_free: { vi: 'Học sinh Miễn phí', en: 'Student Free' },
  student_plus: { vi: 'Học sinh Plus', en: 'Student Plus' },
  teacher_free: { vi: 'Giáo viên Miễn phí', en: 'Teacher Free' },
  teacher_pro: { vi: 'Giáo viên Pro', en: 'Teacher Pro' },
};

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** `YYYY-MM-DDTHH:mm` in Vietnam time, for a datetime-local input. */
export function toVietnamLocal(iso: string): string {
  return new Date(new Date(iso).getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 16);
}

/** The UTC instant of a Vietnam-time `YYYY-MM-DDTHH:mm`, or null when empty or invalid. */
export function fromVietnamLocal(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const t = Date.parse(`${local}:00Z`) - VIETNAM_OFFSET_MS;
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function rowsFrom(snapshot: AccountQuotaSnapshot): QuotaRow[] {
  return snapshot.quotas.map((q) => ({
    metric: q.metric,
    mode: q.source === 'override' ? 'custom' : 'plan',
    limit: String(q.limit),
    expires: q.source === 'override' && q.expiresAt ? toVietnamLocal(q.expiresAt) : '',
  }));
}

const wholeNumber = (s: string) => /^\d{1,7}$/.test(s.trim());

export function validRow(row: QuotaRow, now: Date): boolean {
  if (row.mode === 'plan') return true;
  if (!wholeNumber(row.limit)) return false;
  if (!row.expires) return true;
  const at = fromVietnamLocal(row.expires);
  return at !== null && new Date(at) > now;
}

/** The limit this row would put in force is under what is already used or held. */
export function belowUsage(row: QuotaRow, quota: AccountQuota): boolean {
  const limit = row.mode === 'plan' ? quota.planLimit : Number(row.limit);
  return wholeNumber(row.mode === 'plan' ? '0' : row.limit) && limit < quota.used + quota.reserved;
}

/** Only what differs from the saved state; an unchanged row is left out (the API keeps it). */
export function changesFrom(snapshot: AccountQuotaSnapshot, rows: QuotaRow[]): QuotaChangeInput[] {
  const saved = new Map(rowsFrom(snapshot).map((r) => [r.metric, r]));
  return rows.flatMap((row): QuotaChangeInput[] => {
    const before = saved.get(row.metric);
    if (!before) return [];
    if (row.mode === 'plan') return before.mode === 'plan' ? [] : [{ metric: row.metric, action: 'reset' }];
    if (before.mode === 'custom' && Number(before.limit) === Number(row.limit) && before.expires === row.expires) return [];
    return [{ metric: row.metric, action: 'set', limit: Number(row.limit), expiresAt: fromVietnamLocal(row.expires) }];
  });
}
