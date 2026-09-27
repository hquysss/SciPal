import { notFound } from 'next/navigation';
import { LevelScope, SubjectProvider } from '@scipal/ui';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { getLessonDetail } from '@/features/lessons/lessonDetailQuery';
import { LessonPartsView } from '@/features/lessons/LessonPartsView';
import { AiTutorButton } from '@/features/ai-tutor/AiTutorButton';
import { LessonCompletionBar } from '@/features/lessons/LessonCompletionBar';
import { LessonHeader } from '@/features/lessons/LessonHeader';
import { fetchLessonPractice } from '@/features/lessons/practiceApi';
import { levelOfGrade } from '@/features/landing/educationLevel';

export const dynamic = 'force-dynamic';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ subject: string; lesson: string }>;
}) {
  const { subject: subjectSlug, lesson: lessonSlug } = await params;
  const result = await getLessonDetail(subjectSlug, lessonSlug);
  if (result.kind === 'not_found') notFound();
  if (result.kind === 'error') {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <LoadErrorNotice
          message={{ en: 'Could not load this lesson.', vi: 'Chưa tải được bài học.' }}
          retryHref={`/${subjectSlug}/${lessonSlug}`}
        />
      </main>
    );
  }

  const { lesson } = result;
  const subject = lesson.subjects;
  const level = levelOfGrade(lesson.grade);
  // One request for the Tự luyện questions (answers stay on the server); a failure offers a retry.
  const practice = lesson.blocks.some((block) => block.type === 'quiz') ? await fetchLessonPractice(lesson.id) : undefined;

  return (
    <LevelScope level={level} className="flex-1">
      <SubjectProvider slug={subject.slug} accentColor={subject.accent_color}>
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8 sm:px-6 sm:pt-12">
          <LessonHeader lesson={lesson} />

          <LessonPartsView
            blocks={lesson.blocks}
            sheet={{ squared: level === 'primary' }}
            practice={practice}
            lessonId={lesson.id}
            completion={<LessonCompletionBar lessonId={lesson.id} subjectSlug={subjectSlug} />}
          />
          <AiTutorButton lessonId={lesson.id} subjectSlug={subjectSlug} token={null} />
        </main>
      </SubjectProvider>
    </LevelScope>
  );
}
