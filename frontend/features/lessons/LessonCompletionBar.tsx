'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CircleCheck } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { postScoreLesson } from '../../lib/api';
import { createBrowserClient } from '../../lib/supabase';
import { PostLessonSurvey } from '../survey/PostLessonSurvey';
import { Alert } from '../../components/ui/alert';
import { buttonVariants } from '../../components/ui/button';

export function LessonCompletionBar({
  lessonId,
  subjectSlug,
}: {
  lessonId: string;
  subjectSlug: string;
}) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [xp, setXp] = useState(0);
  const [error, setError] = useState(false);

  const handleComplete = async () => {
    setError(false);
    setLoading(true);
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const res = await postScoreLesson({ lesson_id: lessonId, answers: [] }, session.access_token);
      if (!Number.isFinite(res.xp_earned) || res.xp_earned < 0) {
        throw new Error('Invalid score response');
      }
      setXp(res.xp_earned);
      setCompleted(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 rounded-xl border border-line bg-surface p-6 text-center">
      {!completed ? (
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-lg font-bold text-ink">
            {t({ en: 'Have you got the hang of this lesson?', vi: 'Bạn đã hiểu bài này chưa?' })}
          </h2>
          <p className="text-sm text-ink-muted">
            {t({
              en: 'Mark it done to earn XP and keep your streak',
              vi: 'Đánh dấu xong để nhận XP và giữ chuỗi ngày học',
            })}
          </p>
          <button type="button" onClick={handleComplete} disabled={loading} className={buttonVariants({ size: 'lg' })}>
            {loading ? t({ en: 'Saving…', vi: 'Đang lưu…' }) : t({ en: 'Mark as complete', vi: 'Đánh dấu hoàn thành' })}
          </button>
          {error && (
            <Alert tone="danger" className="mt-3 text-left">
              {t({
                en: 'Could not save your progress. Check your connection and try again.',
                vi: 'Chưa lưu được tiến trình. Kiểm tra kết nối rồi thử lại nhé.',
              })}
            </Alert>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <CircleCheck aria-hidden="true" className="mx-auto h-10 w-10 text-success" />
          <h2 className="text-lg font-bold text-ink">
            {xp > 0
              ? t({ en: `Lesson done! +${xp} XP`, vi: `Xong bài! +${xp} XP` })
              : t({ en: 'You already finished this lesson', vi: 'Bạn đã học xong bài này' })}
          </h2>
          <p className="text-sm text-ink-muted">
            {t({ en: 'You can see it on your progress page.', vi: 'Xem lại trong trang Tiến trình.' })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/progress" className={buttonVariants({ variant: 'outline' })}>
              {t({ en: 'View progress', vi: 'Xem tiến trình' })}
            </Link>
            <Link href={`/${subjectSlug}`} className={buttonVariants()}>
              {t({ en: 'Back to lessons', vi: 'Về danh sách bài' })}
            </Link>
          </div>

          <div className="mt-6 w-full border-t border-dashed border-line pt-6 text-left">
            <PostLessonSurvey lessonId={lessonId} />
          </div>
        </div>
      )}
    </div>
  );
}
