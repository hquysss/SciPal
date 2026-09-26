import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SubjectProvider } from '@scipal/ui';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { getLessonDetail } from '@/features/lessons/lessonDetailQuery';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { AiTutorButton } from '@/features/ai-tutor/AiTutorButton';
import { LessonCompletionBar } from '@/features/lessons/LessonCompletionBar';

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
      <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-24">
        <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <LoadErrorNotice
            message={{ en: 'Could not load this lesson.', vi: 'Chưa tải được bài học.' }}
            retryHref={`/${subjectSlug}/${lessonSlug}`}
          />
        </main>
      </div>
    );
  }

  const { lesson } = result;
  const subject = lesson.subjects;

  return (
    <SubjectProvider slug={subject.slug} accentColor={subject.accent_color}>
      <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-24">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, var(--accent) 0%, transparent 75%)`,
          }}
        />

        <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Breadcrumbs */}
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs font-mono text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition">
              Trang chủ
            </Link>
            <span>/</span>
            <Link href={`/${subject.slug}`} className="hover:text-gray-900 transition font-semibold" style={{ color: 'var(--accent)' }}>
              {subject.name_vi}
            </Link>
            <span>/</span>
            <span>{lesson.topics.name_vi}</span>
            <span>/</span>
            <span className="text-gray-800 font-bold truncate max-w-xs">{lesson.title_vi}</span>
          </nav>

          {/* Lesson Header Card */}
          <header className="mb-10 rounded-2xl border bg-white/95 p-6 sm:p-8 shadow-sm backdrop-blur-xs"
            style={{ borderColor: 'color-mix(in srgb, var(--accent) 10%, var(--surface))' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-2xs"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Lớp {lesson.grade} · {subject.name_vi}
              </span>
              <span className="text-xs font-mono text-gray-400">
                {lesson.blocks.length} phần nội dung
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight leading-tight">
              {lesson.title_vi}
            </h1>
            <p className="mt-1 text-sm font-mono text-gray-400">
              {lesson.title_en}
            </p>
          </header>

          {/* Blocks renderer */}
          <div className="space-y-6">
            {lesson.blocks.map((block, i) => (
              <div key={i} className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs">
                <BlockRenderer block={block} />
              </div>
            ))}
          </div>

          {/* Completion Bar */}
          <LessonCompletionBar lessonId={lesson.id} subjectSlug={subjectSlug} />

          {/* Floating AI Tutor trigger button */}
          <AiTutorButton lessonId={lesson.id} subjectSlug={subjectSlug} token={null} />
        </main>
      </div>
    </SubjectProvider>
  );
}
