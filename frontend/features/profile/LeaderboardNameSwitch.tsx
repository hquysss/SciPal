'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { getLeaderboardPublic, saveLeaderboardPublic } from '@/features/challenges/challengesApi';

/** Whether others see the learner's name on the global leaderboard (off by default; saved by the backend). */
export function LeaderboardNameSwitch({ rowLabel, rowHint }: { rowLabel: string; rowHint: string }) {
  const { t } = useLanguage();
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    void getLeaderboardPublic().then((value) => alive && setOn(value));
    return () => {
      alive = false;
    };
  }, []);
  if (on === null) return null;

  const toggle = async () => {
    setSaving(true);
    setError(false);
    const next = !on;
    if (await saveLeaderboardPublic(next)) setOn(next);
    else setError(true);
    setSaving(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
      <div>
        <div className={rowLabel}>
          <Trophy aria-hidden="true" className="h-4 w-4" />
          <span id="leaderboard-name-label">{t({ en: 'Show my name on the global leaderboard', vi: 'Hiện tên trên bảng xếp hạng toàn hệ thống' })}</span>
        </div>
        <div className={rowHint}>
          {error
            ? <span className="text-danger">{t({ en: 'Could not save. Try again.', vi: 'Chưa lưu được. Thử lại nhé.' })}</span>
            : t({
                en: 'When off, people who are not your friends see you as "Student #rank". Friends and classmates always see your name.',
                vi: 'Khi tắt, người không phải bạn bè thấy bạn là "Học sinh #hạng". Bạn bè và bạn cùng lớp luôn thấy tên bạn.',
              })}
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        role="switch"
        aria-checked={on}
        aria-labelledby="leaderboard-name-label"
        className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
      >
        <span className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors motion-reduce:transition-none ${on ? 'bg-action' : 'bg-edge'}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-surface transition-transform motion-reduce:transition-none ${on ? 'translate-x-5' : 'translate-x-0'}`} />
        </span>
      </button>
    </div>
  );
}
