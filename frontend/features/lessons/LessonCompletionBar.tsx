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
            {t({ en: 'Have you got the hang of this lesson?', vi: 'Bạn đã nắm vững nội dung bài học này chưa?' })}
          </h2>
          <p className="text-sm text-ink-muted">
            {t({
              en: 'Save your progress to earn XP and keep your streak',
              vi: 'Ghi nhận tiến trình để tích lũy XP và duy trì chuỗi học liên tục',
            })}
          </p>
          <button type="button" onClick={handleComplete} disabled={loading} className={buttonVariants({ size: 'lg' })}>
            {loading ? t({ en: 'Saving…', vi: 'Đang lưu…' }) : t({ en: 'Mark as complete', vi: 'Đánh dấu hoàn thành' })}
          </button>
          {error && (
            <Alert tone="danger" className="mt-3 text-left">
              {t({
                en: 'Could not save your progress. Check your connection and try again.',
                vi: 'Chưa thể lưu tiến trình. Vui lòng thử lại khi kết nối ổn định.',
              })}
            </Alert>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <CircleCheck aria-hidden="true" className="mx-auto h-10 w-10 text-success" />
          <h2 className="text-lg font-bold text-ink">
            {xp > 0
              ? t({ en: `Lesson saved. You earned ${xp} XP.`, vi: `Đã lưu bài. Bạn nhận +${xp} XP.` })
              : t({ en: 'This lesson was already saved as complete', vi: 'Bài học đã được ghi nhận hoàn thành' })}
          </h2>
          <p className="text-sm text-ink-muted">
            {t({ en: 'Your progress is saved in your profile.', vi: 'Tiến trình đã được lưu lại trong hồ sơ cá nhân.' })}
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
