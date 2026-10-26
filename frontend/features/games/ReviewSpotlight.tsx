'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookmarkCheck, Languages, Repeat } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';
import { getReviewSummary, type ReviewSummary } from '@/features/review/reviewApi';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/**
 * "Review words today" on the games hub: how many cards are due, the English side of the next few
 * (never the meaning), and the two doors: review now, open the word list. Hidden when unreadable.
 */
export function ReviewSpotlightView({ summary }: { summary: ReviewSummary | null }) {
  const { t } = useLanguage();
  if (!summary) return null;
  const { due, total, preview, nextDue } = summary;

  const headline =
    total === 0
      ? t({ en: 'Start your word list', vi: 'Bắt đầu sổ từ của em' })
      : due > 0
        ? t({ en: `${due} ${due === 1 ? 'word' : 'words'} to review today`, vi: `${due} từ cần ôn hôm nay` })
        : t({ en: 'All caught up for today', vi: 'Xong phần ôn hôm nay' });
  const body =
    total === 0
      ? t({ en: 'Tap a term in any lesson to save it. It comes back here as an English ↔ Vietnamese card.', vi: 'Chạm một thuật ngữ trong bài để lưu. Từ đó quay lại đây thành thẻ Anh ↔ Việt.' })
      : due > 0
        ? t({ en: 'English on the front, Vietnamese on the back. Each word you remember earns 2 XP.', vi: 'Mặt trước tiếng Anh, mặt sau tiếng Việt. Mỗi từ em nhớ được +2 XP.' })
        : nextDue
          ? t({
              en: `Next card: ${new Date(nextDue).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.`,
              vi: `Thẻ kế tiếp: ${new Date(nextDue).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
            })
          : t({ en: 'Save more words to keep the streak of reviews going.', vi: 'Lưu thêm từ để duy trì việc ôn.' });

  return (
    <section
      aria-labelledby="review-spotlight-title"
      className="relative isolate overflow-hidden rounded-3xl border border-line bg-[linear-gradient(120deg,color-mix(in_srgb,var(--sky)_22%,var(--surface)),var(--surface)_60%)] p-5 sm:p-7"
    >
      <Languages aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 -z-10 h-40 w-40 text-[color-mix(in_srgb,var(--sky)_35%,transparent)]" />
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink-muted">
            <Repeat aria-hidden="true" className="h-3.5 w-3.5" />
            {t({ en: 'Review words · Ôn từ', vi: 'Ôn từ · Review words' })}
          </p>
          <h2 id="review-spotlight-title" className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {headline}
          </h2>
          <p className="max-w-prose text-sm text-ink-muted sm:text-base">{body}</p>
          {due > 0 && preview.length > 0 && (
            <ul aria-label={t({ en: 'Next words', vi: 'Các từ sắp ôn' })} className="flex flex-wrap gap-2">
              {preview.map((word, i) => (
                <li key={`${word}-${i}`} lang="en" className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink">
                  {word} <span aria-hidden="true" className="text-ink-muted">↔ ?</span>
                </li>
              ))}
              {due > preview.length && (
                <li className="rounded-xl px-2 py-1.5 text-sm font-semibold text-ink-muted">+{due - preview.length}</li>
              )}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
          {total > 0 && (
            <Link prefetch={false} href="/review" className={`${buttonVariants({ size: 'lg', variant: due > 0 ? 'default' : 'outline' })} ${FOCUS}`}>
              <Repeat aria-hidden="true" className="h-4 w-4" />
              {due > 0 ? t({ en: 'Review now · +2 XP/word', vi: 'Ôn ngay · +2 XP/từ' }) : t({ en: 'Open review', vi: 'Mở trang ôn' })}
            </Link>
          )}
          <Link prefetch={false} href={total > 0 ? '/glossary?filter=saved' : '/glossary'} className={`${buttonVariants({ size: 'lg', variant: total > 0 ? 'outline' : 'default' })} ${FOCUS}`}>
            <BookmarkCheck aria-hidden="true" className="h-4 w-4" />
            {total > 0
              ? t({ en: `My words (${total})`, vi: `Sổ từ (${total} từ)` })
              : t({ en: 'Open the glossary', vi: 'Mở từ điển' })}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ReviewSpotlight() {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  useEffect(() => {
    let alive = true;
    void getReviewSummary().then((result) => {
      if (alive) setSummary(result);
    });
    return () => {
      alive = false;
    };
  }, []);
  return <ReviewSpotlightView summary={summary} />;
}
