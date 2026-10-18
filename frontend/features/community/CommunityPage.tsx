'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Button } from '@/components/ui/button';
import { FRIENDS_CHANGED_EVENT, listFriends } from '../friends/friendsApi';
import { FriendsTab } from '../friends/FriendsTab';
import { getChatRooms, listChatClasses, setChatGrade } from './chatApi';
import { ChatPane } from './ChatPane';
import { ConversationList, GRADES, type Conversation, type ConversationData } from './ConversationList';

type Bilingual = { vi: string; en: string };

/** The open conversation lives in the URL (`?room=10`, `?tab=classes&class=<id>`, `?tab=friends&dm=<id>`, `?tab=friends`) so it can be linked and survives a reload. */
export function conversationFromParams(params: URLSearchParams): Conversation | null {
  const room = params.get('room');
  if (room === 'all') return { kind: 'room', grade: null };
  if (room && GRADES.includes(Number(room))) return { kind: 'room', grade: Number(room) };
  const tab = params.get('tab');
  const classId = params.get('class');
  if (tab === 'classes' && classId) return { kind: 'class', id: classId };
  const dm = params.get('dm');
  if (tab === 'friends') return dm ? { kind: 'dm', id: dm } : { kind: 'friends' };
  return null;
}

export function conversationHref(c: Conversation): string {
  if (c.kind === 'room') return `/community?room=${c.grade ?? 'all'}`;
  if (c.kind === 'class') return `/community?tab=classes&class=${encodeURIComponent(c.id)}`;
  if (c.kind === 'dm') return `/community?tab=friends&dm=${encodeURIComponent(c.id)}`;
  return '/community?tab=friends';
}

/** A messenger: conversations on the left, the open one on the right. A phone shows one side at a time. */
export function CommunityPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const selected = conversationFromParams(params);
  // With nothing chosen, a wide screen still shows the shared room; a phone shows the list.
  const shown: Conversation = selected ?? { kind: 'room', grade: null };
  const [data, setData] = useState<ConversationData | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);

  const load = useCallback(async () => {
    const [rooms, classes, friends] = await Promise.all([getChatRooms(), listChatClasses(), listFriends()]);
    const failed = [rooms, classes, friends].find((r) => !r.ok);
    setError(failed && !failed.ok ? failed.error : null);
    setData({
      grades: rooms.ok ? rooms.data.grades : [],
      classes: classes.ok ? classes.data.classes : [],
      friends: friends.ok ? friends.data.friends : [],
      incoming: friends.ok ? friends.data.incoming.length : 0,
    });
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener(FRIENDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(FRIENDS_CHANGED_EVENT, refresh);
  }, [load]);

  const open = (c: Conversation) => router.replace(conversationHref(c));
  const back = () => router.replace('/community');

  const chooseGrade = async (grade: number) => {
    const result = await setChatGrade(grade);
    if (!result.ok) return setError(result.error);
    setError(null);
    setData((prev) => (prev ? { ...prev, grades: [grade] } : prev));
    open({ kind: 'room', grade });
  };

  const pane = (() => {
    if (shown.kind === 'room') {
      const g = shown.grade;
      return (
        <ChatPane
          key={`room:${g ?? 'all'}`}
          target={g === null ? { community: true } : { room_grade: g }}
          title={g === null ? t({ en: 'Everyone', vi: 'Tất cả' }) : t({ en: `Grade ${g}`, vi: `Khối ${g}` })}
          subtitle={g === null ? t({ en: 'Everyone on SciPal, all subjects', vi: 'Mọi người trên SciPal, mọi môn học' }) : t({ en: `Students in grade ${g}`, vi: `Học sinh khối ${g}` })}
          onBack={back}
        />
      );
    }
    if (shown.kind === 'class') {
      const name = data?.classes.find((c) => c.id === shown.id)?.name;
      return (
        <ChatPane key={`class:${shown.id}`} target={{ class_id: shown.id }} title={name ?? t({ en: 'Class', vi: 'Lớp học' })}
          subtitle={t({ en: 'Teacher and classmates', vi: 'Thầy cô và các bạn trong lớp' })} onBack={back} />
      );
    }
    if (shown.kind === 'dm') {
      const name = data?.friends.find((f) => f.id === shown.id)?.display_name?.trim();
      return (
        <ChatPane key={`dm:${shown.id}`} target={{ friendship_id: shown.id }} title={name || t({ en: 'User', vi: 'Người dùng' })}
          onBack={back} onBlocked={() => { back(); void load(); }} />
      );
    }
    return (
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
          <Button type="button" variant="ghost" size="icon" className="lg:hidden" aria-label={t({ en: 'Back', vi: 'Quay lại' })} onClick={back}><ArrowLeft aria-hidden="true" /></Button>
          <h2 className="text-lg font-bold text-ink">{t({ en: 'Friends', vi: 'Bạn bè' })}</h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <FriendsTab onDm={(id) => (id ? open({ kind: 'dm', id }) : back())} />
        </div>
      </div>
    );
  })();

  return (
    <div className="grid h-[calc(100dvh-9rem)] min-h-[32rem] overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-[20rem_1fr]">
      <aside className={`min-h-0 border-line lg:block lg:border-r ${selected ? 'hidden' : 'block'}`}>
        <ConversationList data={data} error={error} active={shown} onOpen={open} onChooseGrade={(g) => void chooseGrade(g)} />
      </aside>
      <section aria-label={t({ en: 'Conversation', vi: 'Cuộc trò chuyện' })} className={`min-h-0 lg:block ${selected ? 'block' : 'hidden'}`}>
        {pane}
      </section>
    </div>
  );
}
