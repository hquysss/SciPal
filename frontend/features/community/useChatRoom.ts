'use client';

import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@scipal/supabase';
import type { ChatMessage, ChatTarget, ReactionChip } from './chatApi';

const PAGE = 50;
const KEEP = 200;
const COLUMNS = 'id, sender_id, sender_name, body, image_url, created_at, reply_to, recalled_at';

/** Joins two batches by id, oldest first, keeping the newest `keep` (older pages the reader asked for pass Infinity). */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[], keep = KEEP): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of [...current, ...incoming]) byId.set(m.id, m);
  const sorted = [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return Number.isFinite(keep) ? sorted.slice(-keep) : sorted;
}

function asMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id), sender_id: String(row.sender_id), sender_name: String(row.sender_name),
    body: String(row.body), image_url: typeof row.image_url === 'string' ? row.image_url : null, created_at: String(row.created_at),
    reply_to: typeof row.reply_to === 'string' ? row.reply_to : null,
    recalled_at: typeof row.recalled_at === 'string' ? row.recalled_at : null,
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
  hasOlder: boolean;
  loadingOlder: boolean;
  loadOlder: () => void;
} {
  const [column, id] = 'community' in target ? ['community', 'true']
    : 'room_grade' in target ? ['room_grade', String(target.room_grade)]
    : 'class_id' in target ? ['class_id', target.class_id] : ['friendship_id', target.friendship_id];
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; messages: ChatMessage[] }>({ status: 'loading', messages: [] });
  const [reactionRows, setReactionRows] = useState<Array<{ message_id: string; user_id: string; emoji: string }>>([]);
  const [tick, setTick] = useState(0);
  const refreshReactions = useCallback(() => setTick((n) => n + 1), []);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  useEffect(() => {
    let live = true;
    const supabase = createBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    setState({ status: 'loading', messages: [] });
    setReactionRows([]);
    setHasOlder(false);

    void supabase.auth.getSession().then(() => {
      if (!live) return;
      // Subscribe before loading so a message that lands in between is not lost; merging drops duplicates.
      channel = supabase
        .channel(`chat:${column}:${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `${column}=eq.${id}` }, (payload) => {
          if (live) setState((prev) => ({ ...prev, messages: mergeMessages(prev.messages, [asMessage(payload.new)]) }));
        })
        // An unsent message comes back as an update with its words cleared; merging replaces it by id.
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `${column}=eq.${id}` }, (payload) => {
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
          setHasOlder((data ?? []).length === PAGE);
        });
    });

    return () => {
      live = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [column, id]);

  // Older history only when the reader scrolls up for it, one page at a time.
  const oldest = state.messages[0]?.created_at ?? null;
  const loadOlder = useCallback(() => {
    if (!oldest || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    void createBrowserClient().from('chat_messages').select(COLUMNS).eq(column, id).lt('created_at', oldest)
      .order('created_at', { ascending: false }).limit(PAGE)
      .then(({ data, error }) => {
        setLoadingOlder(false);
        if (error) return;
        setHasOlder((data ?? []).length === PAGE);
        setState((prev) => ({ ...prev, messages: mergeMessages(prev.messages, (data ?? []).map(asMessage), Infinity) }));
      });
  }, [column, id, oldest, loadingOlder, hasOlder]);

  // Reactions are re-read for the messages on screen whenever one changes; RLS limits them to readable messages.
  const ids = state.messages.map((m) => m.id).join(',');
  useEffect(() => {
    if (!ids) return;
    let live = true;
    // In chunks, so a long scrolled-back history does not overflow the request URL.
    const all = ids.split(',');
    const chunks = Array.from({ length: Math.ceil(all.length / 100) }, (_, i) => all.slice(i * 100, i * 100 + 100));
    const supabase = createBrowserClient();
    void Promise.all(chunks.map((chunk) => supabase.from('chat_reactions').select('message_id, user_id, emoji').in('message_id', chunk)))
      .then((results) => {
        if (live && results.every((r) => r.data)) setReactionRows(results.flatMap((r) => r.data as Array<{ message_id: string; user_id: string; emoji: string }>));
      });
    return () => {
      live = false;
    };
  }, [ids, tick]);

  return { messages: state.messages, reactions: groupReactions(reactionRows, meId), status: state.status, refreshReactions, hasOlder, loadingOlder, loadOlder };
}
