'use client';

import { useState } from 'react';
import { ChatList, ChatTranscript } from './AdminChats';
import type { AdminConversation, AdminMessage } from './api';

/** Dev showcase of the conversations tab with sample data (the real tab loads from the API). */
export function AdminChatsPreview({ conversations, messages }: { conversations: AdminConversation[]; messages: AdminMessage[] }) {
  const [open, setOpen] = useState<AdminConversation | null>(null);
  return open ? (
    <ChatTranscript conversation={open} messages={messages} onBack={() => setOpen(null)} />
  ) : (
    <ChatList conversations={conversations} onOpen={setOpen} />
  );
}
