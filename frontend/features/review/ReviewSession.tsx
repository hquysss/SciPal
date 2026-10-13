'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';
import { authoringCall } from '@/features/authoring/apiClient';
import { speakTerm } from '@/features/glossary/pronunciation';

/** A due card of the learner's word list, with the term it shows. */
export type ReviewCard = {
  term_id: string;
  term_en: string;
  term_vi: string;
  ipa: string | null;
  part_of_speech: string | null;
  definition_en: string;
  definition_vi: string;
  example_en: string | null;
  example_vi: string | null;
};

type Grade = 'again' | 'hard' | 'good';

const GRADES: Array<{ grade: Grade; key: string; label: { en: string; vi: string } }> = [
  { grade: 'again', key: '1', label: { en: 'Again', vi: 'Quên' } },
  { grade: 'hard', key: '2', label: { en: 'Hard', vi: 'Khó' } },
  { grade: 'good', key: '3', label: { en: 'Good', vi: 'Nhớ' } },
];

/**
 * One round of review: the English side, flip (Space) for the meaning, then Again / Hard / Good
 * (1 / 2 / 3). The server schedules each card and decides the XP; this only shows what it says.
 */
export function ReviewSession({ cards, hasWords, nextDue }: { cards: ReviewCard[]; hasWords: boolean; nextDue: string | null }) {
  const { lang, t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [xp, setXp] = useState(0);
  const card = cards[index];

  const grade = useCallback(
    async (value: Grade) => {
      if (!card || busy) return;
      setBusy(true);
      setFailed(false);
      const res = await authoringCall<{ due_at: string; xp_earned: number }>(`/api/me/terms/${encodeURIComponent(card.term_id)}/review`, 'POST', { grade: value });
      setBusy(false);
      if (!res.ok) return setFailed(true);
      setXp((n) => n + (res.data.xp_earned ?? 0));
      setFlipped(false);
      setIndex((i) => i + 1);
    },
    [card, busy],
  );

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      if (e.key === ' ' && !flipped) {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      const choice = flipped ? GRADES.find((g) => g.key === e.key) : undefined;
      if (choice) void grade(choice.grade);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, flipped, grade]);

  if (!card) {
    if (!hasWords) {
      return (
        <section className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold text-ink">{t({ en: 'Your word list is empty', vi: 'Sổ từ của bạn đang trống' })}</h2>
          <p className="text-ink-muted">
            {t({ en: 'Tap a term in a lesson and it goes into your word list, ready to review.', vi: 'Chạm vào một thuật ngữ trong bài, từ đó sẽ vào sổ từ để ôn.' })}
          </p>
          <Link href="/glossary?filter=saved" className={buttonVariants({ variant: 'outline' })}>
            {t({ en: 'My words', vi: 'Sổ từ của tôi' })}
          </Link>
        </section>
      );
    }
    return (
      <section className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold text-ink">{t({ en: 'Done for today', vi: 'Xong phần ôn hôm nay' })}</h2>
        {xp > 0 && <p className="font-semibold text-action">+{xp} XP</p>}
        {nextDue && (
          <p className="text-ink-muted">
            {t({ en: 'Next review', vi: 'Lần ôn tiếp theo' })}:{' '}
            {new Date(nextDue).toLocaleString(lang === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        <Link href="/glossary?filter=saved" className={buttonVariants({ variant: 'outline' })}>
          {t({ en: 'My words', vi: 'Sổ từ của tôi' })}
        </Link>
      </section>
    );
  }

  const example = lang === 'en' ? card.example_en : card.example_vi;
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        {t({ en: `Card ${index + 1} of ${cards.length}`, vi: `Thẻ ${index + 1} / ${cards.length}` })}
      </p>
      <article className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-line bg-surface p-6 text-center shadow-[0_1px_0_var(--line)]">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h2 lang="en" className="text-3xl font-bold text-ink">
            {card.term_en}
          </h2>
          <button
            type="button"
            onClick={() => void speakTerm(card.term_en, 'en')}
            aria-label={t({ en: `Listen: ${card.term_en}`, vi: `Nghe: ${card.term_en}` })}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Volume2 aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {card.ipa && (
          <span lang="en" className="text-ink-muted">
            /{card.ipa}/
          </span>
        )}
        {flipped && (
          <div className="flex flex-col items-center gap-2 border-t border-line pt-3">
            <p className="text-xl font-semibold text-accent-ink">{card.term_vi}</p>
            {card.part_of_speech && <p className="text-sm text-ink-muted">{card.part_of_speech}</p>}
            <p className="text-ink">{lang === 'en' ? card.definition_en : card.definition_vi}</p>
            {example && <p className="text-sm italic text-ink-muted">{example}</p>}
          </div>
        )}
      </article>

      {failed && (
        <p role="status" className="text-sm font-semibold text-ink">
          {t({ en: 'Not saved. Try again.', vi: 'Chưa lưu được. Thử lại nhé.' })}
        </p>
      )}

      {flipped ? (
        <div className="grid grid-cols-3 gap-2">
          {GRADES.map(({ grade: value, key, label }) => (
            <button
              key={value}
              type="button"
              disabled={busy}
              onClick={() => void grade(value)}
              className={buttonVariants({ variant: value === 'good' ? 'default' : 'outline', size: 'lg' })}
            >
              <span aria-hidden="true" className="text-xs opacity-70">
                {key}
              </span>{' '}
              {t(label)}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setFlipped(true)} className={buttonVariants({ size: 'lg' })}>
          {t({ en: 'Flip the card', vi: 'Lật thẻ' })}
        </button>
      )}
    </section>
  );
}
