'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getChatRooms, setChatGrade } from './chatApi';
import { ChatPane } from './ChatPane';

const GRADES = [10, 11, 12];

/** The room everyone shares, plus the room of the reader's grade (teachers and admins see all three). */
export function CommunityRoom() {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<{ grades: number[] } | null>(null);
  const [room, setRoom] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    void getChatRooms().then((result) => {
      if (!live) return;
      if (result.ok) setRooms({ grades: result.data.grades });
      else setError(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const chooseGrade = async (grade: number) => {
    const result = await setChatGrade(grade);
    if (!result.ok) return setError(true);
    setError(false);
    setRooms({ grades: [grade] });
    setRoom(grade);
  };

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="danger">{t({ en: 'Could not load the rooms.', vi: 'Không tải được các phòng.' })}</Alert>}
      {rooms && rooms.grades.length === 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
          <p className="text-sm text-ink">{t({ en: 'Which grade are you in? Pick one to join your grade room.', vi: 'Bạn học khối mấy? Chọn để vào phòng của khối.' })}</p>
          {GRADES.map((grade) => (
            <Button key={grade} type="button" variant="outline" onClick={() => void chooseGrade(grade)}>
              {t({ en: `Grade ${grade}`, vi: `Khối ${grade}` })}
            </Button>
          ))}
        </div>
      )}
      {rooms && rooms.grades.length > 0 && (
        <div role="group" aria-label={t({ en: 'Rooms', vi: 'Phòng' })} className="flex flex-wrap gap-2">
          {[null, ...rooms.grades].map((grade) => (
            <Button key={grade ?? 'all'} type="button" variant={room === grade ? 'default' : 'outline'} aria-pressed={room === grade} onClick={() => setRoom(grade)}>
              {grade === null ? t({ en: 'Everyone', vi: 'Tất cả' }) : t({ en: `Grade ${grade}`, vi: `Khối ${grade}` })}
            </Button>
          ))}
        </div>
      )}
      <ChatPane
        key={room ?? 'all'}
        target={room === null ? { community: true } : { room_grade: room }}
        title={room === null ? t({ en: 'Community', vi: 'Cộng đồng' }) : t({ en: `Grade ${room}`, vi: `Khối ${room}` })}
        subtitle={room === null ? t({ en: 'Everyone on SciPal, all subjects', vi: 'Mọi người trên SciPal, mọi môn học' }) : t({ en: `Students in grade ${room}`, vi: `Học sinh khối ${room}` })}
      />
    </div>
  );
}
