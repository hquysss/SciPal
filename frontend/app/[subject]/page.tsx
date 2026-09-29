import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LevelScope, SubjectProvider } from '@scipal/ui';
import { TopicAccordion } from '@/features/lessons/TopicAccordion';
import { getSubjectPage } from '@/features/lessons/subjectPageQuery';
import { GradeHeading, InDevelopmentNotice } from '@/features/lessons/SubjectPageNotices';
import { SubjectHeader } from '@/features/lessons/SubjectHeader';
import { levelOfGrade } from '@/features/landing/educationLevel';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { pageTitle } from '@/lib/pageTitle';

export const dynamic = 'force-dynamic';

// One query per request for the page and its tab title.
const loadSubject = cache(getSubjectPage);

export async function generateMetadata({ params }: { params: Promise<{ subject: string }> }): Promise<Metadata> {
  const result = await loadSubject((await params).subject);
  return result.kind === 'ok' ? pageTitle(result.subject.name_en, result.subject.name_vi) : pageTitle('Subject', 'Môn học');
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: subjectSlug } = await params;
  const result = await loadSubject(subjectSlug);
  if (result.kind === 'not_found') notFound();

  if (result.kind === 'error') {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <LoadErrorNotice
          message={{ en: 'Could not load this subject.', vi: 'Chưa tải được dữ liệu môn học.' }}
          retryHref={`/${subjectSlug}`}
        />
      </main>
    );
  }

  const { subject, gradeGroups } = result;
  const topicCount = gradeGroups.reduce((acc, group) => acc + group.topics.length, 0);
  const lessonCount = gradeGroups.reduce(
    (acc, group) => acc + group.topics.reduce((sum, topic) => sum + topic.lessons.length, 0),
    0,
  );

  return (
    <SubjectProvider slug={subject.slug} accentColor={subject.accent_color}>
      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <SubjectHeader subject={subject} topicCount={topicCount} lessonCount={lessonCount} />
        {gradeGroups.length === 0 ? (
          <InDevelopmentNotice />
        ) : (
          <div className="flex flex-col gap-10">
            {gradeGroups.map((group) => (
              <LevelScope key={group.grade} level={levelOfGrade(group.grade)} className="flex flex-col gap-3">
                <GradeHeading grade={group.grade} />
                <TopicAccordion topics={group.topics} subjectSlug={subject.slug} />
              </LevelScope>
            ))}
          </div>
        )}
      </main>
    </SubjectProvider>
  );
}
