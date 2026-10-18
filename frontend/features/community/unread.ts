'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@scipal/supabase';

const READ_EVENT = 'scipal:chat-read';

// The generated types do not list these functions yet.
type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
const rpc = (fn: string, args?: Record<string, unknown>) =>
  (createBrowserClient() as unknown as { rpc: Rpc }).rpc(fn, args);

/** The read-marker key of a conversation: "all", "10"…, "class:<id>" or "dm:<friendship id>". */
export const readKeyOf = (c: { kind: 'room'; grade: number | null } | { kind: 'class'; id: string } | { kind: 'dm'; id: string }): string =>
  c.kind === 'room' ? (c.grade === null ? 'all' : String(c.grade)) : `${c.kind}:${c.id}`;

/** The red count pill, the same as the friend-request count in the navbar. */
export const UNREAD_BADGE = 'inline-grid h-5 min-w-5 place-items-center rounded-full bg-danger-surface px-1 text-xs font-bold leading-none text-danger ring-1 ring-danger';

/** "99+" past 99, so a busy room does not stretch the badge. */
export const badgeText = (n: number): string => (n > 99 ? '99+' : String(n));

/** Records that the reader has seen a conversation up to now; every unread counter on the page refreshes. */
export async function markChatRead(conv: string): Promise<void> {
  try {
    const { error } = await rpc('chat_mark_read', { p_conv: conv });
    if (!error) window.dispatchEvent(new Event(READ_EVENT));
  } catch {
    // No Supabase configured: nothing to mark.
  }
}

async function loadUnread(): Promise<Record<string, number> | null> {
  try {
    const { data, error } = await rpc('chat_unread_counts');
    if (error) return null;
    return Object.fromEntries(((data ?? []) as Array<{ conv: string; unread: number }>).map((r) => [r.conv, r.unread]));
  } catch {
    return null;
  }
}

/**
 * Unread messages per conversation and in total, for a signed-in reader. Recounted when a message the reader can
 * see arrives (RLS filters what Realtime sends), when a conversation is marked read and when the tab comes back.
 */
export function useChatUnread(enabled = true): { counts: Record<string, number>; total: number } {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) {
      setCounts({});
      return;
    }
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => void loadUnread().then((next) => { if (live && next) setCounts(next); });
    // A burst of messages recounts once.
    const soon = () => { clearTimeout(timer); timer = setTimeout(refresh, 800); };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };

    let supabase: ReturnType<typeof createBrowserClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null = null;
    try {
      supabase = createBrowserClient();
      // Several counters may be on one page; each needs its own channel name.
      channel = supabase.channel(`chat-unread:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, soon)
        .subscribe();
    } catch {
      return; // no Supabase configured: nothing to count
    }
    refresh();
    window.addEventListener(READ_EVENT, refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      clearTimeout(timer);
      window.removeEventListener(READ_EVENT, refresh);
      document.removeEventListener('visibilitychange', onVisible);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [enabled]);

  return { counts, total: Object.values(counts).reduce((sum, n) => sum + n, 0) };
}
