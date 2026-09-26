'use client';

import { useState, type KeyboardEvent } from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { postSurvey } from '../../lib/api';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';

interface PostLessonSurveyProps {
  lessonId: string;
  onDone?: () => void;
}

const DIFFICULTY_LABEL = {
  easy: { en: 'Easy', vi: 'Dễ hiểu' },
  medium: { en: 'Moderate', vi: 'Vừa sức' },
  hard: { en: 'Challenging', vi: 'Khá khó' },
} as const;

export function PostLessonSurvey({ lessonId, onDone }: PostLessonSurveyProps) {
  const { t } = useLanguage();
  const [rating, setRating] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');

  const handleSubmit = async () => {
    setStatus('submitting');
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
      setStatus('sent');
      if (onDone) setTimeout(onDone, 1800);
    } catch (err) {
      console.warn('Post-lesson survey submission warning:', err);
      setStatus('error');
    }
  };

  // Arrow keys move the rating like a native radio group.
  const onStarKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setRating((r) => Math.min(5, r + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setRating((r) => Math.max(1, r - 1));
    }
  };

  if (status === 'sent') {
    return (
      <Alert tone="success">
        {t({
          en: 'Thank you for your feedback! SciPal uses it to improve lessons.',
          vi: 'Cảm ơn phản hồi của bạn! SciPal ghi nhận để nâng cao chất lượng bài giảng.',
        })}
      </Alert>
    );
  }

  const chip = (active: boolean) =>
    `min-h-11 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
      active ? 'bg-action text-action-ink' : 'border border-edge bg-surface text-ink hover:bg-surface-sunken'
    }`;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h3 className="border-b border-line pb-2.5 text-sm font-bold text-ink">
        {t({ en: 'Quick lesson feedback', vi: 'Khảo sát nhanh chất lượng bài học' })}
      </h3>

      {/* Star rating */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span id="survey-rating-label" className="text-sm font-semibold text-ink">
          {t({ en: 'How would you rate this lesson?', vi: 'Bạn đánh giá bài học này thế nào?' })}
        </span>
        <div role="radiogroup" aria-labelledby="survey-rating-label" className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={s === rating}
              aria-label={t({ en: `${s} out of 5 stars`, vi: `${s} trên 5 sao` })}
              tabIndex={s === rating ? 0 : -1}
              onClick={() => setRating(s)}
              onKeyDown={onStarKey}
              className={`flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                s <= rating ? 'text-action' : 'text-edge'
              }`}
            >
              <Star aria-hidden="true" className="h-7 w-7" fill={s <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty chips */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-semibold text-ink">
          {t({ en: 'How hard was it for you?', vi: 'Độ khó so với bạn' })}
        </span>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button key={d} type="button" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)} className={chip(difficulty === d)}>
              {t(DIFFICULTY_LABEL[d])}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback textarea */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">{t({ en: 'Suggestion (optional)', vi: 'Góp ý (không bắt buộc)' })}</span>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t({
            en: 'Figures, code or content that needs clarifying (max 200 characters)…',
            vi: 'Hình vẽ, mã nguồn hay nội dung cần làm rõ (tối đa 200 ký tự)…',
          })}
          maxLength={200}
          rows={2}
          className="w-full rounded-lg border border-edge bg-surface p-2.5 text-base text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      </label>

      {status === 'error' && (
        <Alert tone="danger">
          {t({
            en: 'Could not send your feedback. Check your connection and try again.',
            vi: 'Chưa gửi được phản hồi. Vui lòng kiểm tra kết nối và thử lại.',
          })}
        </Alert>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            {t({ en: 'Skip', vi: 'Bỏ qua' })}
          </Button>
        )}
        <Button type="button" onClick={handleSubmit} disabled={status === 'submitting'}>
          {status === 'submitting' ? t({ en: 'Sending…', vi: 'Đang gửi…' }) : t({ en: 'Send feedback', vi: 'Gửi đánh giá' })}
        </Button>
      </div>
    </section>
  );
}
