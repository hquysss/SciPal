'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CircleCheck, CloudOff } from 'lucide-react';
import { LESSON_COMPLETE_XP } from '@scipal/types';
import { useLanguage } from '@scipal/hooks';
import { postScoreLesson } from '../../lib/api';
import { createBrowserClient } from '../../lib/supabase';
import { estimateStreak, queueCompletion, recordStreak } from '../../lib/pwa/pendingCompletions';
import { PENDING_CHANGED } from '../../components/pwa/PendingSync';
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
  const [error, setError] = useState<false | 'save' | 'auth'>(false);
  const [queued, setQueued] = useState<{ streak: number | null } | null>(null);

  const handleComplete = async () => {
    setError(false);
    setLoading(true);
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) {
        if (!navigator.onLine) setError('auth');
        else router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      try {
        const res = await postScoreLesson({ lesson_id: lessonId, answers: [] }, session.access_token);
        if (!Number.isFinite(res.xp_earned) || res.xp_earned < 0) {
          throw new Error('Invalid score response');
        }
        recordStreak(session.user.id, subjectSlug, res.new_streak);
        setXp(res.xp_earned);
        setCompleted(true);
      } catch (cause) {
        // Only a lost connection waits for later; an answer from the server (even an error) is shown as is.
        if ((cause as { status?: number }).status !== undefined || navigator.onLine) throw cause;
        const saved = queueCompletion({ user_id: session.user.id, lesson_id: lessonId, subject: subjectSlug, queued_at: new Date().toISOString() });
        if (!saved) throw cause;
        window.dispatchEvent(new Event(PENDING_CHANGED));
        setQueued({ streak: estimateStreak(session.user.id, subjectSlug) });
      }
    } catch {
      setError('save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 rounded-xl border border-line bg-surface p-6 text-center">
      {queued ? (
        <div className="flex flex-col items-center gap-3">
          <CloudOff aria-hidden="true" className="mx-auto h-10 w-10 text-warning" />
          <h2 className="text-lg font-bold text-ink">
            {t({ en: 'Saved on this device', vi: 'Đã lưu trên máy' })}
          </h2>
          <p className="text-sm font-semibold text-warning">
            {t({ en: `~+${LESSON_COMPLETE_XP} XP`, vi: `~+${LESSON_COMPLETE_XP} XP` })}
            {queued.streak !== null && t({ en: ` · ~${queued.streak}-day streak`, vi: ` · chuỗi ~${queued.streak} ngày` })}
            {' '}
            {t({ en: '(estimate, waiting to sync)', vi: '(tạm tính, chờ đồng bộ)' })}
          </p>
          <p className="text-sm text-ink-muted">
            {t({
              en: 'It will be sent when you are back online. The server decides the real XP and streak.',
              vi: 'Sẽ gửi khi có mạng lại. XP và chuỗi ngày chính thức do máy chủ quyết định.',
            })}
          </p>
        </div>
      ) : !completed ? (
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
              {error === 'auth'
                ? t({
                    en: 'Go online once to confirm your sign-in, then mark this lesson done.',
                    vi: 'Cần có mạng một lần để xác nhận đăng nhập, rồi hãy đánh dấu hoàn thành.',
                  })
                : t({
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
