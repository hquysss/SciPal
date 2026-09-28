// Refusals from the capacity triggers (migration 20260929020000_teacher_capacity): the database
// raises 'QUOTA_EXCEEDED' with the metric in `details` and the limit in `hint`.

type DbError = { code?: string; message?: string; details?: string | null; hint?: string | null } | null | undefined;

const TEXT: Record<string, (n: number) => { vi: string; en: string }> = {
  active_classes: (n) => ({
    vi: `Gói hiện tại cho tối đa ${n} lớp đang hoạt động. Nâng cấp gói hoặc nhờ admin nới hạn mức.`,
    en: `Your plan allows ${n} active class${n === 1 ? '' : 'es'}. Upgrade the plan or ask an admin to raise the quota.`,
  }),
  students_per_class: (n) => ({
    vi: `Lớp này đã đủ ${n} học sinh. Hãy báo giáo viên của lớp.`,
    en: `This class already has ${n} students. Let the class teacher know.`,
  }),
  active_authored_exams: (n) => ({
    vi: `Gói hiện tại cho tối đa ${n} đề tự soạn đang hoạt động. Xóa bớt đề nháp, nâng cấp gói hoặc nhờ admin nới hạn mức.`,
    en: `Your plan allows ${n} active authored exams. Delete a draft, upgrade the plan or ask an admin to raise the quota.`,
  }),
};

/** The 429 body for a capacity refusal, or null when the error is something else. */
export function capacityRefusal(error: DbError) {
  if (!error || error.message !== 'QUOTA_EXCEEDED') return null;
  const metric = error.details ?? '';
  const limit = Number(error.hint ?? '0') || 0;
  const text = (TEXT[metric] ?? (() => ({ vi: 'Đã đạt giới hạn của gói hiện tại.', en: 'The plan limit has been reached.' })))(limit);
  return { code: 'QUOTA_EXCEEDED', error: text.vi, error_en: text.en, metric, limit };
}
