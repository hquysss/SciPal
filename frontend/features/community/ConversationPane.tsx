'use client';

import { useLanguage } from '@scipal/hooks';
import { ChatPane } from './ChatPane';
import type { Conversation, ConversationData } from './ConversationList';

/** The open chat of a room, a class or a friend, titled from the loaded list. The friends manager is not a chat and is shown by the caller. */
export function ConversationPane({ conversation, data, onBack, onBlocked, backAlways }: {
  conversation: Exclude<Conversation, { kind: 'friends' }>;
  data: ConversationData | null;
  onBack: () => void;
  onBlocked: () => void;
  /** Show the back button at every width (the floating panel is always narrow). */
  backAlways?: boolean;
}) {
  const { t } = useLanguage();
  if (conversation.kind === 'room') {
    const g = conversation.grade;
    return (
      <ChatPane
        key={`room:${g ?? 'all'}`}
        target={g === null ? { community: true } : { room_grade: g }}
        title={g === null ? t({ en: 'Everyone', vi: 'Tất cả' }) : t({ en: `Grade ${g}`, vi: `Khối ${g}` })}
        subtitle={g === null ? t({ en: 'Everyone on SciPal, all subjects', vi: 'Mọi người trên SciPal, mọi môn học' }) : t({ en: `Students in grade ${g}`, vi: `Học sinh khối ${g}` })}
        onBack={onBack}
        backAlways={backAlways}
      />
    );
  }
  if (conversation.kind === 'class') {
    const name = data?.classes.find((c) => c.id === conversation.id)?.name;
    return (
      <ChatPane key={`class:${conversation.id}`} target={{ class_id: conversation.id }} title={name ?? t({ en: 'Class', vi: 'Lớp học' })}
        subtitle={t({ en: 'Teacher and classmates', vi: 'Thầy cô và các bạn trong lớp' })} onBack={onBack} backAlways={backAlways} />
    );
  }
  const friend = data?.friends.find((f) => f.id === conversation.id);
  const name = friend?.display_name?.trim();
  return (
    <ChatPane key={`dm:${conversation.id}`} target={{ friendship_id: conversation.id }} title={name || t({ en: 'User', vi: 'Người dùng' })}
      peerId={friend?.user_id} onBack={onBack} onBlocked={onBlocked} backAlways={backAlways} />
  );
}
