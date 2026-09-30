import { notFound } from 'next/navigation';
import type { Block } from '@scipal/types';
import { LessonEditor } from '@/features/authoring/LessonEditor';
import { LessonCreateForm } from '@/features/authoring/LessonCreateForm';
import { ClassList } from '@/features/classes/ClassList';
import { StudentRoster } from '@/features/classes/StudentRoster';
import { ExamBuilder } from '@/features/authoring/exams/ExamBuilder';
import { ExamReviewCard } from '@/features/authoring/exams/ExamReview';
import { QuestionBank } from '@/features/authoring/exams/QuestionBank';
import { ExamManageTabs } from '@/components/nav/TeacherAreaTabs';
import { TopicManager } from '@/features/authoring/topics/TopicManager';
import { AiSettingsForm } from '@/features/admin-ai/AiSettingsForm';
import { AdminChatsPreview } from '@/features/admin-ai/AdminChatsPreview';
import { AdminAiTabs } from '@/features/admin-ai/AdminAiTabs';
import { AccountQuotaForm } from '@/features/admin/AccountQuotaDialog';
import type { AuthorQuestion } from '@/features/authoring/practice/api';

type SearchParams = Record<string, string | string[] | undefined>;

const BLOCKS: Block[] = [
  { type: 'theory', content: { en: 'An **algorithm** is a finite sequence of steps.', vi: '**Thuật toán** là một dãy hữu hạn các bước.' } },
  { type: 'formula', katex: 'T(n) = 2T(n/2) + O(n)', caption: { en: 'Merge sort', vi: 'Sắp xếp trộn' } },
];

const SUBJECTS = [{ id: '00000000-0000-4000-8000-000000000001', slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', sort_order: 1, grades: [10, 11, 12] }];
const q = (n: number, type: AuthorQuestion['type'], difficulty: number, status: AuthorQuestion['status'], stem: string): AuthorQuestion => ({
  id: `00000000-0000-4000-8000-00000000010${n}`, usage: 'exam', subject_id: SUBJECTS[0]!.id, lesson_id: null, grade: 10, type, difficulty, status,
  created_at: '2026-09-27T00:00:00Z', mine: true, editable: status !== 'published', data: { stem: { vi: stem, en: stem } },
});
const QUESTIONS = [
  q(1, 'mc', 1, 'published', 'Thuật toán tìm kiếm nhị phân cần dãy như thế nào?'),
  q(2, 'truefalse', 2, 'draft', 'Xét các ý về độ phức tạp của sắp xếp nổi bọt.'),
  q(3, 'short', 3, 'published', 'Với n = 1024, tìm kiếm nhị phân cần tối đa bao nhiêu lần so sánh?'),
];
const EXAM = {
  id: '00000000-0000-4000-8000-000000000200', name: 'Kiểm tra giữa kỳ I — Tin học 10', name_en: 'Midterm I — Informatics 10', subject_id: SUBJECTS[0]!.id,
  subject_name_vi: 'Tin học', grade: 10, duration_minutes: 45, question_count: 3, updated_at: '2026-09-27T00:00:00Z', created_by: 't1', imported: false, mine: true,
  question_ids: QUESTIONS.map((x) => x.id), review_note: null,
};

const CHATS = [
  { id: 'c1', title: 'Giải thích độ phức tạp O(n log n) bằng ví dụ.', student: { id: 's1', name: 'Nguyễn Minh An' }, lesson: { id: 'l1', title_vi: 'Thuật toán sắp xếp', title_en: 'Sorting algorithms' }, messages: 6, created_at: '2026-09-28T03:00:00Z', updated_at: '2026-09-28T03:20:00Z' },
  { id: 'c2', title: 'Vì sao vòng lặp while của em chạy mãi không dừng?', student: { id: 's2', name: null }, lesson: null, messages: 2, created_at: '2026-09-27T12:00:00Z', updated_at: '2026-09-27T12:05:00Z' },
];

/** Dev-only preview of teacher/admin screens, which are auth-gated in the app. */
export default async function TeacherShowcase({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const params = await searchParams;
  const status = (params.status as 'draft' | 'pending_review' | 'published' | 'rejected') ?? 'draft';
  const view = params.view ?? 'editor';

  return (
    <main className="mx-auto w-full flex max-w-6xl flex-col gap-6 px-4 py-8">
      {view === 'exam' ? (
        <>
          <ExamManageTabs active="exams" />
          <ExamBuilder
            exam={{ ...EXAM, status: status === 'rejected' ? 'draft' : status, editable: status === 'draft' || status === 'rejected' || params.role === 'admin', review_note: status === 'rejected' ? 'Thêm câu mức khó.' : null }}
            subjects={SUBJECTS}
            isAdmin={params.role === 'admin'}
            initialQuestions={QUESTIONS}
          />
        </>
      ) : view === 'new-exam' ? (
        <ExamBuilder exam={null} subjects={SUBJECTS} isAdmin={params.role === 'admin'} />
      ) : view === 'bank' ? (
        <>
          <ExamManageTabs active="exams" />
          <QuestionBank subjects={SUBJECTS} />
        </>
      ) : view === 'quotas' ? (
        <div className="max-w-2xl rounded-xl border border-line bg-surface p-6">
          <AccountQuotaForm
            accountId="u1"
            initial={{
              account: { id: 'u1', plan: 'student_free', paidThrough: null },
              version: 2,
              quotas: [
                { metric: 'graded_exam_attempts', kind: 'monthly', limit: 3, planLimit: 3, used: 1, reserved: 0, source: 'plan', expiresAt: null, resetsAt: '2026-09-30T17:00:00.000Z' },
                { metric: 'tutor_requests', kind: 'monthly', limit: 30, planLimit: 10, used: 40, reserved: 0, source: 'override', expiresAt: '2026-10-31T16:59:00.000Z', resetsAt: '2026-09-30T17:00:00.000Z' },
              ],
            }}
            initialAudit={{ entries: [{ id: 'e1', actor: { id: 'a1', name: 'Cô Hà' }, before: {}, after: { tutor_requests: { limit: 30, expires_at: '2026-10-31T16:59:00.000Z' } }, reason: 'Lớp chuyên thử nghiệm', createdAt: '2026-09-20T03:00:00.000Z' }], next: null }}
          />
        </div>
      ) : view === 'ai-chats' ? (
        <div className="flex flex-col gap-6">
          <AdminAiTabs active="chats" />
          <AdminChatsPreview
            conversations={CHATS}
            messages={[
              { role: 'user', content: 'Giải thích độ phức tạp $O(n \log n)$ bằng ví dụ.' },
              { role: 'assistant', content: 'Em thử tưởng tượng có **16 lá bài** cần xếp. Nếu cứ chia đôi mãi, em cần chia mấy lần để mỗi phần còn 1 lá?' },
            ]}
          />
        </div>
      ) : view === 'ai' ? (
        <AiSettingsForm
          initial={{
            saved: { provider: 'gemini', model: null, daily_limit: 20, enabled: true, updated_at: '2026-09-28T08:00:00Z' },
            effective: { provider: 'gemini', model: 'gemini-3.8-flash', dailyLimit: 20, enabled: true },
            keys: { gemini: true, openai: false },
            defaults: { gemini: 'gemini-3.8-flash', openai: 'gpt-5-mini' },
            usage: { today: 42, week: 318, students_week: 27 },
            translate: { effective: { enabled: true, dailyChars: 200000 }, usage: { today: 12400, week: 86300 } },
          }}
        />
      ) : view === 'topics' ? (
        <TopicManager
          subjects={[{ id: 's1', slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', sort_order: 1, grades: [10, 11, 12] }]}
          initialTopics={[
            { id: 'a', subject_id: 's1', slug: 'g10-a', grade: 10, name_en: 'Computers and society', name_vi: 'Máy tính và xã hội tri thức', sort_order: 0, lesson_count: 4 },
            { id: 'b', subject_id: 's1', slug: 'g10-b', grade: 10, name_en: 'Programming basics', name_vi: 'Lập trình cơ bản', sort_order: 1, lesson_count: 0 },
            { id: 'c', subject_id: 's1', slug: 'legacy', grade: null, name_en: 'Ethics online', name_vi: 'Đạo đức trên mạng', sort_order: 2, lesson_count: 1 },
          ]}
        />
      ) : view === 'review' ? (
        <ExamReviewCard exam={{ ...EXAM, status: 'pending_review', mine: false }} />
      ) : view === 'classes' ? (
        <>
          <ClassList
            initialClasses={[{ id: 'c1', name: '10A1 Tin học', subject_id: 's1', invite_code: '4KQ9TZ', student_count: 2, created_at: '2026-09-20T00:00:00Z', subject_name_en: 'Informatics', subject_name_vi: 'Tin học' }]}
          />
          <StudentRoster
            classNameTitle="10A1 Tin học"
            inviteCode="4KQ9TZ"
            members={[
              { student_id: 'a', display_name: 'Nguyễn Minh An', joined_at: '2026-09-21T00:00:00Z', total_xp: 1240, completed_lessons: 12 },
              { student_id: 'b', display_name: 'Trần Bảo Châu', joined_at: '2026-09-22T00:00:00Z', total_xp: 380 },
            ]}
          />
        </>
      ) : view === 'create' ? (
        <LessonCreateForm
          subjects={[{ id: 's1', slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', sort_order: 1, grades: [3, 7, 10, 11] }]}
          topics={[]}
          tracks={[]}
        />
      ) : (
        <LessonEditor
          lessonId="showcase"
          subjectId="00000000-0000-4000-8000-000000000001"
          initialTitleVi="Thuật toán tìm kiếm"
          initialTitleEn="Search algorithms"
          initialBlocks={BLOCKS}
          initialUpdatedAt="2026-09-26T00:00:00Z"
          initialStatus={status}
          initialReviewNote={status === 'rejected' ? 'Thêm ví dụ cho tìm kiếm nhị phân.' : null}
          canReview={params.role === 'admin'}
        />
      )}
    </main>
  );
}
