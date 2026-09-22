'use client';

import { useState } from 'react';
import { postSurvey } from '@/lib/api';
import { useLanguage } from '@scipal/hooks';

interface PostLessonSurveyProps {
  lessonId: string;
  onDone?: () => void;
}

export function PostLessonSurvey({ lessonId, onDone }: PostLessonSurveyProps) {
  const { t } = useLanguage();
  const [rating, setRating] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await postSurvey({
        type: 'post_lesson',
        payload: {
          lesson_id: lessonId,
          rating,
          difficulty,
          feedback: feedback.trim(),
        },
      });
    } catch (err) {
      console.warn('Post-lesson survey submission warning:', err);
    } finally {
      setSubmitted(true);
      setSubmitting(false);
      if (onDone) setTimeout(onDone, 1800);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-5 text-center text-xs font-bold text-emerald-800 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in zoom-in-95 duration-150">
        🎉 {t({
          en: 'Thank you for your valuable feedback! SciPal uses this to improve lesson quality.',
          vi: 'Cảm ơn phản hồi quý giá của bạn! SciPal ghi nhận để không ngừng nâng cao chất lượng bài giảng.',
        })}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-emerald-950/10 bg-white/90 p-5 sm:p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-card/90 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-800">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
          📊 {t({ en: 'Micro-Survey · Lesson Feedback (§9.7)', vi: 'Khảo sát nhanh chất lượng bài học (§9.7)' })}
        </h4>
        <span className="font-mono text-[10px] text-gray-400">10 giây</span>
      </div>

      {/* Star rating */}
      <div className="text-center space-y-1">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {t({ en: 'How would you rate this lesson?', vi: 'Bạn đánh giá bài học này thế nào?' })}
        </span>
        <div className="flex gap-2 justify-center text-3xl">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              className={`transition hover:scale-110 active:scale-95 ${
                s <= rating ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty chips */}
      <div className="space-y-1 text-center">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {t({ en: 'Perceived difficulty level', vi: 'Độ khó so với bạn' })}:
        </span>
        <div className="flex justify-center gap-2 pt-1">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`rounded-full px-4 py-1 text-xs font-bold transition duration-150 active:scale-95 ${
                difficulty === d
                  ? 'bg-gray-900 text-white shadow-xs dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {d === 'easy'
                ? t({ en: 'Easy', vi: 'Dễ hiểu' })
                : d === 'medium'
                ? t({ en: 'Moderate', vi: 'Vừa sức' })
                : t({ en: 'Challenging', vi: 'Khá khó' })}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback textarea */}
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder={t({
          en: 'Optional suggestion or clarification needed (max 200 chars)...',
          vi: 'Góp ý thêm về hình vẽ, mã nguồn hay nội dung cần làm rõ (tối đa 200 ký tự)...',
        })}
        maxLength={200}
        rows={2}
        className="w-full rounded-xl border border-gray-200 bg-gray-50/60 p-2.5 text-xs outline-none focus:border-emerald-600 focus:bg-white transition dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {t({ en: 'Skip', vi: 'Bỏ qua' })}
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
        >
          {submitting
            ? t({ en: 'Submitting...', vi: 'Đang gửi...' })
            : t({ en: 'Submit Feedback', vi: 'Gửi đánh giá' })}
        </button>
      </div>
    </div>
  );
}
