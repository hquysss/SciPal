import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SUBJECT_CONFIG, type SubjectSlug } from '@/lib/subject-config';
import { SubjectProvider } from '@/features/subjects/SubjectContext';
import { TopicAccordion } from '@/features/lessons/TopicAccordion';
import { getSubjectWithTopicsAndLessons } from '@/features/lessons/lessonQueries';

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: subjectSlug } = await params;
  const config = SUBJECT_CONFIG[subjectSlug as SubjectSlug];
  if (!config || config.status === 'upcoming') notFound();

  const data = await getSubjectWithTopicsAndLessons(subjectSlug);
  if (!data) notFound();

  const totalLessons = data.topics.reduce(
    (acc: number, t: any) => acc + (t.lessons?.length ?? 0),
    0,
  );

  return (
    <SubjectProvider subject={config}>
      <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
        {/* Subtle subject aura */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-25"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, var(--accent, #16a34a) 0%, transparent 70%)`,
          }}
        />

        <main className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="font-semibold" style={{ color: 'var(--accent, #16a34a)' }}>
              {config.nameVi}
            </span>
          </nav>

          {/* Subject Header Banner */}
          <header className="mb-10 rounded-2xl border bg-white/90 p-6 sm:p-8 shadow-sm backdrop-blur-xs"
            style={{ borderColor: 'var(--accent-10, #e5e7eb)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-inner"
                  style={{
                    backgroundColor: `${config.accentColor}15`,
                    color: config.accentColor,
                    border: `1px solid ${config.accentColor}30`,
                  }}
                >
                  {config.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1
                      className="text-2xl sm:text-3xl font-black tracking-tight"
                      style={{ color: 'var(--accent, #16a34a)' }}
                    >
                      {data.subject.name_vi}
                    </h1>
                    <span className="text-xs font-mono text-gray-400">({config.nameEn})</span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-gray-600">
                    Chương trình khoa học tự nhiên THPT chuẩn hóa song ngữ
                  </p>
                </div>
              </div>

              {/* Stats pills */}
              <div className="flex items-center gap-2 sm:self-center">
                <div className="rounded-xl bg-gray-50 border border-gray-200/80 px-3 py-1.5 text-center">
                  <span className="block text-xs font-bold text-gray-900">{data.topics.length}</span>
                  <span className="text-[10px] text-gray-400 font-mono">Chủ đề</span>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-200/80 px-3 py-1.5 text-center">
                  <span className="block text-xs font-bold text-gray-900">{totalLessons}</span>
                  <span className="text-[10px] text-gray-400 font-mono">Bài học</span>
                </div>
              </div>
            </div>
          </header>

          {/* Topics Accordion Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-900">Danh mục chủ đề & bài giảng</h2>
              <span className="text-xs text-gray-400 font-mono">Bấm vào chủ đề để mở bài học</span>
            </div>

            <TopicAccordion topics={data.topics as never} subjectSlug={subjectSlug} />
          </section>
        </main>
      </div>
    </SubjectProvider>
  );
}

export async function generateStaticParams() {
  return Object.keys(SUBJECT_CONFIG).map((slug) => ({ subject: slug }));
}
