import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SubjectProvider } from '@scipal/ui';
import { TopicAccordion } from '@/features/lessons/TopicAccordion';
import { getSubjectPage } from '@/features/lessons/subjectPageQuery';
import { GradeHeading, InDevelopmentNotice, LevelLine } from '@/features/lessons/SubjectPageNotices';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';

export const dynamic = 'force-dynamic';

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: subjectSlug } = await params;
  const result = await getSubjectPage(subjectSlug);
  if (result.kind === 'not_found') notFound();

  if (result.kind === 'error') {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
        <main className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          <LoadErrorNotice
            message={{ en: 'Could not load this subject.', vi: 'Chưa tải được dữ liệu môn học.' }}
            retryHref={`/${subjectSlug}`}
          />
        </main>
      </div>
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
      <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
        {/* Subtle subject aura */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-25"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, var(--accent) 0%, transparent 70%)`,
          }}
        />

        <main className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>
              {subject.name_vi}
            </span>
          </nav>

          {/* Subject Header Banner */}
          <header className="mb-10 rounded-2xl border bg-white/90 p-6 sm:p-8 shadow-sm backdrop-blur-xs"
            style={{ borderColor: 'color-mix(in srgb, var(--accent) 10%, var(--surface))' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-inner"
                  style={{
                    backgroundColor: `${subject.accent_color}15`,
                    color: subject.accent_color,
                    border: `1px solid ${subject.accent_color}30`,
                  }}
                >
                  {subject.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--accent)' }}>
                      {subject.name_vi}
                    </h1>
                    <span className="text-xs font-mono text-gray-400">({subject.name_en})</span>
                  </div>
                  <LevelLine levels={subject.levels} />
                </div>
              </div>

              {/* Stats pills */}
              <div className="flex items-center gap-2 sm:self-center">
                <div className="rounded-xl bg-gray-50 border border-gray-200/80 px-3 py-1.5 text-center">
                  <span className="block text-xs font-bold text-gray-900">{topicCount}</span>
                  <span className="text-[10px] text-gray-400 font-mono">Chủ đề</span>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-200/80 px-3 py-1.5 text-center">
                  <span className="block text-xs font-bold text-gray-900">{lessonCount}</span>
                  <span className="text-[10px] text-gray-400 font-mono">Bài học</span>
                </div>
              </div>
            </div>
          </header>

          {gradeGroups.length === 0 ? (
            <InDevelopmentNotice />
          ) : (
            <section className="space-y-8">
              {gradeGroups.map((group) => (
                <div key={group.grade} className="space-y-3">
                  <GradeHeading grade={group.grade} />
                  <TopicAccordion topics={group.topics} subjectSlug={subject.slug} />
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
    </SubjectProvider>
  );
}
