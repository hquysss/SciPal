'use client';

import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@scipal/supabase';
import type { ChatMessage, ChatTarget, ReactionChip } from './chatApi';

const PAGE = 50;
const KEEP = 200;
const COLUMNS = 'id, sender_id, sender_name, body, image_url, created_at, reply_to';

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
    reply_to: typeof row.reply_to === 'string' ? row.reply_to : null,
  };
}

/** Counts reaction rows per message and emoji, in a stable order; `mine` marks the reader's own. */
export function groupReactions(rows: Array<{ message_id: string; user_id: string; emoji: string }>, meId: string | null): Record<string, ReactionChip[]> {
  const out: Record<string, ReactionChip[]> = {};
  for (const row of rows) {
    const chips = (out[row.message_id] ??= []);
    const chip = chips.find((c) => c.emoji === row.emoji) ?? (chips[chips.push({ emoji: row.emoji, count: 0, mine: false }) - 1]);
    chip.count += 1;
    if (row.user_id === meId) chip.mine = true;
  }
  return out;
}

/**
 * The latest messages of a room, a class or a direct chat, kept current over Supabase Realtime, with their
 * reactions. RLS decides what is readable and who hears new rows, so nothing here filters for privacy.
 */
export function useChatRoom(target: ChatTarget, meId: string | null = null): {
  messages: ChatMessage[];
  reactions: Record<string, ReactionChip[]>;
  status: 'loading' | 'ready' | 'error';
  refreshReactions: () => void;
} {
  const [column, id] = 'community' in target ? ['community', 'true']
    : 'room_grade' in target ? ['room_grade', String(target.room_grade)]
    : 'class_id' in target ? ['class_id', target.class_id] : ['friendship_id', target.friendship_id];
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; messages: ChatMessage[] }>({ status: 'loading', messages: [] });
  const [reactionRows, setReactionRows] = useState<Array<{ message_id: string; user_id: string; emoji: string }>>([]);
  const [tick, setTick] = useState(0);
  const refreshReactions = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    const supabase = createBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    setState({ status: 'loading', messages: [] });
    setReactionRows([]);

    void supabase.auth.getSession().then(() => {
      if (!live) return;
      // Subscribe before loading so a message that lands in between is not lost; merging drops duplicates.
      channel = supabase
        .channel(`chat:${column}:${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `${column}=eq.${id}` }, (payload) => {
          if (live) setState((prev) => ({ ...prev, messages: mergeMessages(prev.messages, [asMessage(payload.new)]) }));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions' }, () => {
          if (live) setTick((n) => n + 1);
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

  // Reactions are re-read for the messages on screen whenever one changes; RLS limits them to readable messages.
  const ids = state.messages.map((m) => m.id).join(',');
  useEffect(() => {
    if (!ids) return;
    let live = true;
    void createBrowserClient().from('chat_reactions').select('message_id, user_id, emoji').in('message_id', ids.split(','))
      .then(({ data }) => {
        if (live && data) setReactionRows(data as Array<{ message_id: string; user_id: string; emoji: string }>);
      });
    return () => {
      live = false;
    };
  }, [ids, tick]);

  return { messages: state.messages, reactions: groupReactions(reactionRows, meId), status: state.status, refreshReactions };
}
