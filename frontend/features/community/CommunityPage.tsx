'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Button } from '@/components/ui/button';
import { FriendsTab } from '../friends/FriendsTab';
import { ConversationPane } from './ConversationPane';
import { ConversationList, GRADES, type Conversation } from './ConversationList';
import { PresenceProvider } from './presence';
import { useConversations } from './useConversations';


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
  const { data, error, reload, chooseGrade: saveGrade } = useConversations();

  const open = (c: Conversation) => router.replace(conversationHref(c));
  const back = () => router.replace('/community');

  const chooseGrade = async (grade: number) => {
    if (await saveGrade(grade)) open({ kind: 'room', grade });
  };

  const pane = (() => {
    if (shown.kind !== 'friends') return <ConversationPane conversation={shown} data={data} onBack={back} onBlocked={() => { back(); void reload(); }} onRoomAvatar={() => void reload()} />;
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
    <PresenceProvider>
    <div className="grid h-[calc(100dvh-9rem)] min-h-[32rem] overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-[20rem_1fr]">
      <aside className={`min-h-0 border-line lg:block lg:border-r ${selected ? 'hidden' : 'block'}`}>
        <ConversationList data={data} error={error} active={shown} onOpen={open} onChooseGrade={(g) => void chooseGrade(g)} />
      </aside>
      <section aria-label={t({ en: 'Conversation', vi: 'Cuộc trò chuyện' })} className={`min-h-0 lg:block ${selected ? 'block' : 'hidden'}`}>
        {pane}
      </section>
    </div>
    </PresenceProvider>
  );
}
