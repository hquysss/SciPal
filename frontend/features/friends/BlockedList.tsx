'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Button } from '@/components/ui/button';
import { listBlocked, unblockUser, type BlockedUser } from '../community/chatApi';

export function BlockedListView({ blocked, onUnblock }: { blocked: BlockedUser[]; onUnblock: (userId: string) => void }) {
  const { t } = useLanguage();
  if (blocked.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-bold text-ink">{t({ en: 'Blocked', vi: 'Đã chặn' })}</h2>
      <ul className="flex flex-col divide-y divide-line">
        {blocked.map((u) => (
          <li key={u.user_id} className="flex min-h-14 items-center gap-3 py-2">
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{u.display_name?.trim() || t({ en: 'User', vi: 'Người dùng' })}</span>
            <Button type="button" variant="outline" onClick={() => onUnblock(u.user_id)}>{t({ en: 'Unblock', vi: 'Bỏ chặn' })}</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** `version` changes whenever the caller blocks someone, so the list reloads. */
export function BlockedList({ version }: { version: number }) {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  const load = useCallback(async () => {
    const result = await listBlocked();
    if (result.ok) setBlocked(result.data.blocked);
  }, []);
  useEffect(() => { void load(); }, [load, version]);

  return <BlockedListView blocked={blocked} onUnblock={(id) => void unblockUser(id).then(load)} />;
}
