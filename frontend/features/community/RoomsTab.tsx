'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ChatPane } from './ChatPane';

type Room = { id: string; name_en: string; name_vi: string };

/** One room per subject. Archived subjects are hidden from the read by RLS, so they get no room. */
export function RoomsTab() {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void createBrowserClient().from('subjects').select('id, name_en, name_vi').order('name_vi')
      .then(({ data, error }) => {
        if (!live) return;
        if (error) return setFailed(true);
        const list = (data ?? []) as Room[];
        setRooms(list);
        setSelected((current) => current ?? list[0]?.id ?? null);
      });
    return () => { live = false; };
  }, []);

  if (failed) return <Alert tone="danger">{t({ en: 'Could not load the rooms.', vi: 'Không tải được các phòng.' })}</Alert>;
  if (!rooms) return <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  if (rooms.length === 0) return <EmptyState title={t({ en: 'No rooms yet', vi: 'Chưa có phòng nào' })} />;

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t({ en: 'Rooms', vi: 'Phòng' })} className="flex flex-wrap gap-2">
        {rooms.map((room) => (
          <Button key={room.id} type="button" variant={room.id === selected ? 'default' : 'outline'} aria-pressed={room.id === selected} onClick={() => setSelected(room.id)}>
            {t({ en: room.name_en, vi: room.name_vi })}
          </Button>
        ))}
      </div>
      {selected && <ChatPane key={selected} target={{ room_subject_id: selected }} />}
    </div>
  );
}
