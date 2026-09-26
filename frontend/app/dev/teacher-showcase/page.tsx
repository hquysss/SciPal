import { notFound } from 'next/navigation';
import type { Block } from '@scipal/types';
import { LessonEditor } from '@/features/authoring/LessonEditor';
import { LessonCreateForm } from '@/features/authoring/LessonCreateForm';
import { ClassList } from '@/features/classes/ClassList';
import { StudentRoster } from '@/features/classes/StudentRoster';

type SearchParams = Record<string, string | string[] | undefined>;

const BLOCKS: Block[] = [
  { type: 'theory', content: { en: 'An **algorithm** is a finite sequence of steps.', vi: '**Thuật toán** là một dãy hữu hạn các bước.' } },
  { type: 'formula', katex: 'T(n) = 2T(n/2) + O(n)', caption: { en: 'Merge sort', vi: 'Sắp xếp trộn' } },
];

/** Dev-only preview of teacher/admin screens, which are auth-gated in the app. */
export default async function TeacherShowcase({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const params = await searchParams;
  const grade = Number(params.grade ?? 10);
  const status = (params.status as 'draft' | 'pending_review' | 'published' | 'rejected') ?? 'draft';
  const view = params.view ?? 'editor';

  return (
    <main className="mx-auto w-full flex max-w-6xl flex-col gap-6 px-4 py-8">
      {view === 'classes' ? (
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
          initialTitleVi="Thuật toán tìm kiếm"
          initialTitleEn="Search algorithms"
          initialBlocks={BLOCKS}
          initialUpdatedAt="2026-09-26T00:00:00Z"
          initialStatus={status}
          initialReviewNote={status === 'rejected' ? 'Thêm ví dụ cho tìm kiếm nhị phân.' : null}
          canReview={params.role === 'admin'}
          grade={grade}
          subjectSlug="informatics"
        />
      )}
    </main>
  );
}
