import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthoringApiError, getAuthoringOptions } from '@/features/authoring/authoringQueries';
import { LessonCreateForm } from '@/features/authoring/LessonCreateForm';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Bi } from '@/components/ui/bilingual';

export const dynamic = 'force-dynamic';

export default async function NewTeacherLessonPage() {
  const { token, role } = await getAuthoringSession('/teacher/lessons/new-lesson');
  if (role !== 'teacher') redirect('/admin/lessons/review');
  let options: Awaited<ReturnType<typeof getAuthoringOptions>> | null = null;
  let loadFailed = false;

  try {
    options = await getAuthoringOptions(token);
  } catch (error) {
    loadFailed = true;
    if (error instanceof AuthoringApiError) console.error('Could not load lesson options:', error.status);
    else console.error('Could not connect to the authoring API.');
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 pb-20 sm:px-6 sm:py-8">
      <PageBreadcrumb
        items={[
          { href: '/teacher/lessons', label: { en: 'Lesson studio', vi: 'Soạn bài' } },
          { label: { en: 'New lesson', vi: 'Bài mới' } },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl"><Bi en="New lesson" vi="Soạn bài giảng mới" /></h1>
        <p className="max-w-prose text-base text-ink-muted">
          <Bi
            en="Fill in the lesson details first; then add content in the studio and send it for review."
            vi="Tạo thông tin bài học trước; sau đó thêm nội dung trong Studio và gửi admin duyệt."
          />
        </p>
      </header>

      {loadFailed || !options ? (
        <Alert tone="danger" title={<Bi en="Could not load subjects and topics." vi="Không tải được môn học và chủ đề." />}>
          <p><Bi en="The lesson was not created. Check the server connection and try again." vi="Bài học chưa được tạo. Hãy kiểm tra kết nối máy chủ rồi thử lại." /></p>
          <Link href="/teacher/lessons/new-lesson" className="mt-2 inline-flex font-semibold underline underline-offset-4">
            <Bi en="Try again" vi="Thử lại" />
          </Link>
        </Alert>
      ) : (
        <LessonCreateForm subjects={options.subjects} topics={options.topics} tracks={options.tracks ?? []} />
      )}
    </main>
  );
}
