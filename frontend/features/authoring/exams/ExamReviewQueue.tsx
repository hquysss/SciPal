import {
  AuthoringApiError,
  getPendingExamImports,
} from '@/features/authoring/authoringQueries';
import { ExamImportReviewActions } from '@/features/content-import/ExamImportReviewActions';
import { Bi } from '@/components/ui/bilingual';
import { PendingExamReviews } from './ExamReview';

// Admin review of exams, at the top of Quản lý đề thi (Thi thử): exams built in SciPal and exams
// imported from Excel. Students only see an exam once an admin approves it here.

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export async function ExamReviewQueue({ token }: { token: string }) {
  let examImports = null;
  try {
    examImports = await getPendingExamImports(token);
  } catch (error) {
    if (error instanceof AuthoringApiError) console.error('Could not load pending exam imports:', error.status);
    else console.error('Could not connect to the authoring API.');
  }

  return (
    <section aria-labelledby="exam-review-title" className="flex flex-col gap-5 rounded-2xl border border-line bg-surface-sunken p-5 sm:p-6">
      <header className="flex flex-col gap-1">
        <h2 id="exam-review-title" className="text-xl font-bold text-ink">
          <Bi en="Waiting for review" vi="Đề chờ duyệt" />
        </h2>
        <p className="text-sm text-ink-muted">
          <Bi en="Teachers' exams reach students only after you approve them." vi="Đề của giáo viên chỉ đến tay học sinh sau khi admin duyệt." />
        </p>
      </header>
      <section aria-labelledby="builder-exams-title" className="flex flex-col gap-3">
        <h3 id="builder-exams-title" className="text-base font-bold text-ink">
          <Bi en="Exams built in SciPal" vi="Đề soạn trong ứng dụng" />
        </h3>
        <PendingExamReviews />
      </section>

      <section aria-labelledby="exam-imports-title" className="flex flex-col gap-3">
        <h3 id="exam-imports-title" className="text-base font-bold text-ink">
          Lượt nhập đề từ Excel{examImports ? ` (${examImports.length})` : ''}
        </h3>
        {examImports === null ? (
          <p role="alert" className="rounded-xl bg-danger-surface p-4 text-sm text-danger">Không tải được đề thi chờ duyệt.</p>
        ) : examImports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-edge p-4 text-sm text-ink-muted">Không có đề thi nào giáo viên gửi đang chờ duyệt.</p>
        ) : (
          examImports.map((item) => {
            const label = item.blueprints[0]?.name ?? `${item.question_count} câu hỏi`;
            return (
              <article key={item.import_id} className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-ink-muted">
                    {item.teacher_name ?? 'Giáo viên'}
                    {item.created_at ? ` · gửi ${formatDate(item.created_at)}` : ''}
                    {' · '}
                    {item.question_count} câu hỏi (
                    {Object.entries(item.question_types)
                      .map(([type, count]) => `${count} ${type === 'mc' ? 'trắc nghiệm' : type === 'truefalse' ? 'đúng/sai' : 'trả lời ngắn'}`)
                      .join(', ')}
                    )
                  </span>
                  {item.blueprints.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {item.blueprints.map((b) => (
                        <li key={b.id} className="text-sm text-ink">
                          <span className="font-bold">{b.name}</span>
                          <span className="text-ink-muted">
                            {' · '}{b.subject_name_vi ?? ''} {b.grade ?? ''} · {b.question_count} câu
                            {b.duration_minutes ? ` · ${b.duration_minutes} phút` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink">Chỉ có câu hỏi, chưa có đề (vào ngân hàng câu hỏi của môn).</p>
                  )}
                </div>
                <ExamImportReviewActions importId={item.import_id} label={label} />
              </article>
            );
          })
        )}
      </section>
    </section>
  );
}
