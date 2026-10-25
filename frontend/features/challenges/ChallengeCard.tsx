'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Swords } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Button } from '@/components/ui/button';
import { answerChallenge, daysLeft, getChallenges, type Challenge, type ChallengeList } from './challengesApi';

type Bilingual = { en: string; vi: string };

function Bar({ label, xp, max, mine }: { label: string; xp: number; max: number; mine: boolean }) {
  const pct = max > 0 ? Math.round((xp / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className={`truncate text-ink ${mine ? 'font-bold' : 'font-medium'}`}>{label}</span>
        <span className="shrink-0 font-bold tabular-nums text-ink">{xp.toLocaleString()} XP</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken" role="presentation">
        <div
          className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%`, background: mine ? 'var(--action)' : 'var(--sky)' }}
        />
      </div>
    </div>
  );
}

function Item({ c, today, onAnswer, busy }: { c: Challenge; today: string; onAnswer: (id: string, a: 'accept' | 'decline') => void; busy: boolean }) {
  const { t } = useLanguage();
  const them = c.other.display_name?.trim() || t({ en: 'Your friend', vi: 'Bạn của bạn' });
  const left = daysLeft(c, today);
  const max = Math.max(c.my_xp, c.their_xp);

  let status: string;
  if (c.status === 'pending') {
    status = c.incoming
      ? t({ en: `${them} challenged you: who earns more XP in 7 days?`, vi: `${them} thách đấu bạn: ai nhiều XP hơn trong 7 ngày?` })
      : t({ en: `Waiting for ${them} to answer.`, vi: `Đang chờ ${them} trả lời.` });
  } else if (c.status === 'active') {
    status = left === null
      ? t({ en: 'Starts tomorrow.', vi: 'Bắt đầu từ ngày mai.' })
      : t({ en: `${left} ${left === 1 ? 'day' : 'days'} left`, vi: `Còn ${left} ngày` });
  } else {
    status = c.winner === 'me' ? t({ en: 'You won!', vi: 'Bạn thắng!' })
      : c.winner === 'them' ? t({ en: `${them} won.`, vi: `${them} thắng.` })
      : t({ en: 'A tie!', vi: 'Hoà!' });
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate font-semibold text-ink">{t({ en: `You vs ${them}`, vi: `Bạn và ${them}` })}</span>
        <span className={`shrink-0 text-sm ${c.status === 'done' && c.winner === 'me' ? 'font-bold text-ink' : 'text-ink-muted'}`}>{status}</span>
      </div>
      {c.status !== 'pending' && (
        <div className="flex flex-col gap-2">
          <Bar label={t({ en: 'You', vi: 'Bạn' })} xp={c.my_xp} max={max} mine />
          <Bar label={them} xp={c.their_xp} max={max} mine={false} />
        </div>
      )}
      {c.status === 'pending' && c.incoming && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => onAnswer(c.id, 'accept')}>{t({ en: 'Accept', vi: 'Chấp nhận' })}</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onAnswer(c.id, 'decline')}>{t({ en: 'Decline', vi: 'Từ chối' })}</Button>
        </div>
      )}
    </li>
  );
}

export function ChallengeCardView({ list, error, busy = false, onAnswer }: {
  list: ChallengeList;
  error?: Bilingual | null;
  busy?: boolean;
  onAnswer: (id: string, answer: 'accept' | 'decline') => void;
}) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="challenges-title" className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky to-coral text-ink">
          <Swords className="h-5 w-5" />
        </span>
        <div>
          <h2 id="challenges-title" className="text-lg font-bold text-ink">{t({ en: 'Weekly challenges', vi: 'Thử thách tuần' })}</h2>
          <p className="text-sm text-ink-muted">{t({ en: 'Who earns more XP in 7 days', vi: 'Ai nhiều XP hơn trong 7 ngày' })}</p>
        </div>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-danger">{t(error)}</p>}
      {list.challenges.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-edge px-4 py-5 text-sm text-ink-muted">
          {t({ en: 'No challenges yet. ', vi: 'Chưa có thử thách nào. ' })}
          <Link href="/community" className="font-semibold text-action underline underline-offset-2">
            {t({ en: 'Challenge a friend', vi: 'Thách đấu một bạn' })}
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.challenges.map((c) => <Item key={c.id} c={c} today={list.today} onAnswer={onAnswer} busy={busy} />)}
        </ul>
      )}
    </section>
  );
}

/** Loads the learner's challenges; shows nothing when the server cannot answer, so the page still works. */
export function ChallengeCard() {
  const [list, setList] = useState<ChallengeList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Bilingual | null>(null);
  const load = useCallback(async () => setList(await getChallenges()), []);
  useEffect(() => {
    void load();
  }, [load]);
  if (!list) return null;

  const answer = async (id: string, a: 'accept' | 'decline') => {
    setBusy(true);
    const result = await answerChallenge(id, a);
    setError(result.ok ? null : { vi: result.error.error ?? 'Chưa xử lý được.', en: result.error.error_en ?? 'That did not work.' });
    await load();
    setBusy(false);
  };
  return <ChallengeCardView list={list} error={error} busy={busy} onAnswer={(id, a) => void answer(id, a)} />;
}
