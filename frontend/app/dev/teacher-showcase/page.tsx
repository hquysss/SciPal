import { notFound } from 'next/navigation';
import type { Block } from '@scipal/types';
import { LessonEditor } from '@/features/authoring/LessonEditor';
import { LessonCreateForm } from '@/features/authoring/LessonCreateForm';
import { ClassList } from '@/features/classes/ClassList';
import { StudentRoster } from '@/features/classes/StudentRoster';
import { ExamBuilder } from '@/features/authoring/exams/ExamBuilder';
import { ExamReviewCard } from '@/features/authoring/exams/ExamReview';
import { QuestionBank } from '@/features/authoring/exams/QuestionBank';
import { TeacherAreaTabs } from '@/components/nav/TeacherAreaTabs';
import { TopicManager } from '@/features/authoring/topics/TopicManager';
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
          <TeacherAreaTabs active="exams" />
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
          <TeacherAreaTabs active="exams" />
          <QuestionBank subjects={SUBJECTS} />
        </>
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
