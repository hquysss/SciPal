'use client';

import Link from 'next/link';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { TONES, toneOfKind } from '@/features/newsletter/announcementTone';
import { clearNotifications, deleteNotification, listNotifications, markNotificationsRead, type Notification } from './gamesApi';

/** The label and icon of a coloured announcement, so the colour is never the only cue. */
function ToneTag({ kind, t }: { kind: string; t: (text: { vi: string; en: string }) => string }) {
  const tone = toneOfKind(kind);
  if (!tone) return null;
  const { icon: Icon, label } = TONES[tone];
  return (
    <span className="mb-0.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-ink">
      <Icon aria-hidden="true" className="size-3.5" />
      {t(label)}
    </span>
  );
}

// The nav mounts two bells (desktop and phone, one hidden by CSS); both load on the same events,
// so they share one request while it is in flight instead of fetching twice.
let inflight: ReturnType<typeof listNotifications> | null = null;
export function loadNotificationsShared(): ReturnType<typeof listNotifications> {
  inflight ??= listNotifications().finally(() => { inflight = null; });
  return inflight;
}

// One realtime channel for every bell on the page, opened by the first and closed with the last.
const listeners = new Set<() => void>();
let closeChannel: (() => void) | null = null;
let channelSeq = 0;
export function subscribeNotifications(onInsert: () => void): () => void {
  listeners.add(onInsert);
  if (!closeChannel) {
    const supabase = createBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let closed = false;
    void supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      if (closed || !userId) return;
      // A new row for this user (RLS filters the rest) refreshes the list at once.
      channel = supabase
        .channel(`notifications:${userId}:${++channelSeq}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => listeners.forEach((l) => l()))
        .subscribe();
    });
    closeChannel = () => {
      closed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }
  return () => {
    listeners.delete(onInsert);
    if (listeners.size === 0) {
      closeChannel?.();
      closeChannel = null;
    }
  };
}

/** The signed-in user's notifications; opening the list marks them read. */
export function NotificationBell({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  const instanceId = useId();
  const listId = 'notification-list-' + instanceId;
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Left offset (px, from the bell) that keeps the list inside the screen: the bell sits mid-bar on a phone.
  const [shift, setShift] = useState(0);

  const load = useCallback(async () => {
    const r = await loadNotificationsShared();
    if (r.ok) { setItems(r.data.notifications); setUnread(r.data.unread); }
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = subscribeNotifications(() => void load());
    // Catch up on anything missed while the tab was hidden or the socket dropped.
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', visible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', visible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !box.current) return;
    const fit = () => {
      const rect = box.current!.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 32);
      const left = Math.min(Math.max(rect.right - width, 16), window.innerWidth - 16 - width);
      setShift(left - rect.left);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [open]);

  const remove = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    void deleteNotification(id).then((r) => { if (!r.ok) void load(); });
  };
  const clearAll = () => {
    setItems([]);
    setUnread(0);
    void clearNotifications().then((r) => { if (!r.ok) void load(); });
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      void markNotificationsRead();
    }
  };

  const label = t({ en: 'Notifications', vi: 'Thông báo' });
  return (
    <div ref={box} className="relative">
      <button type="button" aria-label={unread ? `${label} (${unread})` : label} title={label} aria-expanded={open} aria-controls={listId} onClick={toggle} className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg ${className}`}>
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-1 top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-action px-1 text-[11px] font-bold leading-5 text-action-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div id={listId} style={{ left: shift, width: 'min(20rem, calc(100vw - 2rem))' }} className="absolute z-50 mt-2 rounded-xl border border-line bg-surface p-2 shadow-lg">
          {items.length === 0 ? (
            <p className="p-3 text-sm text-ink-muted">{t({ en: 'No notifications yet.', vi: 'Chưa có thông báo nào.' })}</p>
          ) : (
            <>
            <div className="flex justify-end px-1 pb-1">
              <button type="button" onClick={clearAll} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                {t({ en: 'Clear all', vi: 'Xóa tất cả' })}
              </button>
            </div>
            <ul className="flex max-h-96 flex-col overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className={`flex items-start gap-1 rounded-lg hover:bg-surface-sunken ${toneOfKind(n.kind) ? `border-l-4 ${TONES[toneOfKind(n.kind)!].bar}` : ''}`}>
                  <Link prefetch={false} href={n.link ?? '#'} onClick={() => setOpen(false)} className={`block min-w-0 flex-1 break-words rounded-lg px-3 py-2.5 text-sm ${n.read ? 'text-ink-muted' : 'font-semibold text-ink'}`}>
                    <ToneTag kind={n.kind} t={t} />
                    {t(n.title)}
                    <span className="block text-xs font-normal text-ink-muted">{new Date(n.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}</span>
                  </Link>
                  <button type="button" onClick={() => remove(n.id)} aria-label={t({ en: 'Delete notification', vi: 'Xóa thông báo' })} className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
