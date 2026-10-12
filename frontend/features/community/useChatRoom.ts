'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@scipal/supabase';
import type { ChatMessage, ChatTarget } from './chatApi';

const PAGE = 50;
const KEEP = 200;
const COLUMNS = 'id, sender_id, sender_name, body, image_url, created_at';

/** Joins two batches by id, oldest first, keeping the newest KEEP. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of [...current, ...incoming]) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-KEEP);
}

function asMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id), sender_id: String(row.sender_id), sender_name: String(row.sender_name),
    body: String(row.body), image_url: typeof row.image_url === 'string' ? row.image_url : null, created_at: String(row.created_at),
  };
}

/**
 * The latest messages of the community room, a class or a direct chat, kept current over Supabase Realtime. RLS decides
 * what is readable and who hears new rows, so nothing here filters for privacy.
 */
export function useChatRoom(target: ChatTarget): { messages: ChatMessage[]; status: 'loading' | 'ready' | 'error' } {
  const [column, id] = 'community' in target ? ['community', 'true'] : 'class_id' in target ? ['class_id', target.class_id] : ['friendship_id', target.friendship_id];
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; messages: ChatMessage[] }>({ status: 'loading', messages: [] });

  useEffect(() => {
    let live = true;
    const supabase = createBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    setState({ status: 'loading', messages: [] });

    void supabase.auth.getSession().then(() => {
      if (!live) return;
      // Subscribe before loading so a message that lands in between is not lost; merging drops duplicates.
      channel = supabase
        .channel(`chat:${column}:${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `${column}=eq.${id}` }, (payload) => {
          if (live) setState((prev) => ({ ...prev, messages: mergeMessages(prev.messages, [asMessage(payload.new)]) }));
        })
        .subscribe();
      void supabase.from('chat_messages').select(COLUMNS).eq(column, id).order('created_at', { ascending: false }).limit(PAGE)
        .then(({ data, error }) => {
          if (!live) return;
          if (error) return setState((prev) => ({ ...prev, status: 'error' }));
          setState((prev) => ({ status: 'ready', messages: mergeMessages(prev.messages, (data ?? []).map(asMessage)) }));
        });
    });

    return () => {
      live = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [column, id]);

  return state;
}
