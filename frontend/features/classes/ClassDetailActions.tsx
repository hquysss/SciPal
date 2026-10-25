'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { ClassManageButtons } from './ClassManageButtons';
import { setClassLeaderboard } from './classActions';

/** Rename and delete on the class page: a rename reloads the page's data, a delete leaves for the class list. */
export function ClassDetailActions({ classId, name, leaderboardEnabled }: { classId: string; name: string; leaderboardEnabled: boolean }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3">
      <ClassManageButtons classId={classId} name={name} onRenamed={() => router.refresh()} onDeleted={() => router.push('/teacher/classes')} />
      <ClassLeaderboardSwitch classId={classId} initial={leaderboardEnabled} />
    </div>
  );
}

/** The teacher turns the class leaderboard students see on or off. */
export function ClassLeaderboardSwitch({ classId, initial }: { classId: string; initial: boolean }) {
  const { lang, t } = useLanguage();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = async () => {
    setBusy(true);
    setError(null);
    const result = await setClassLeaderboard(classId, !on);
    setBusy(false);
    if (result.ok) setOn(!on);
    else setError(lang === 'en' ? result.error.en : result.error.vi);
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Trophy aria-hidden="true" className="h-4 w-4" />
          <span id="class-leaderboard-label">{t({ en: 'Class leaderboard', vi: 'Bảng xếp hạng của lớp' })}</span>
        </div>
        <p className="text-sm text-ink-muted">
          {error
            ? <span className="text-danger">{error}</span>
            : t({ en: 'Students in this class can see each other’s XP ranking.', vi: 'Học sinh trong lớp xem được thứ hạng XP của nhau.' })}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        role="switch"
        aria-checked={on}
        aria-labelledby="class-leaderboard-label"
        className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
      >
        <span className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors motion-reduce:transition-none ${on ? 'bg-action' : 'bg-edge'}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-surface transition-transform motion-reduce:transition-none ${on ? 'translate-x-5' : 'translate-x-0'}`} />
        </span>
      </button>
    </div>
  );
}
