import { notFound } from 'next/navigation';
import type { Block } from '@scipal/types';
import { LessonEditor } from '@/features/authoring/LessonEditor';
import { LessonCreateForm } from '@/features/authoring/LessonCreateForm';

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
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      {view === 'create' ? (
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
