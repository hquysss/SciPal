'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversationList, type Conversation } from './ConversationList';
import { ConversationPane } from './ConversationPane';
import { useConversations } from './useConversations';

/** The community chat inside the floating bubble: the list, then one open chat with a back button. */
export function CommunityMini({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { data, error, reload, chooseGrade } = useConversations();
  const [open, setOpen] = useState<Exclude<Conversation, { kind: 'friends' }> | null>(null);

  if (open) {
    return <ConversationPane conversation={open} data={data} backAlways onBack={() => setOpen(null)} onBlocked={() => { setOpen(null); void reload(); }} />;
  }
  return (
    <ConversationList
      data={data}
      error={error}
      active={null}
      onOpen={(c) => {
        // Finding friends needs the full page; everything else opens right here.
        if (c.kind === 'friends') { onNavigate(); router.push('/community?tab=friends'); } else setOpen(c);
      }}
      onChooseGrade={(g) => void chooseGrade(g).then((ok) => ok && setOpen({ kind: 'room', grade: g }))}
    />
  );
}
