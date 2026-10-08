'use client';

import Link from 'next/link';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { listNotifications, markNotificationsRead, type Notification } from './gamesApi';

/** The signed-in user's notifications; opening the list marks them read. */
export function NotificationBell({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  const instanceId = useId();
  const listId = 'notification-list-' + instanceId;
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await listNotifications();
    if (r.ok) { setItems(r.data.notifications); setUnread(r.data.unread); }
  }, []);

  useEffect(() => {
    void load();
    // A new row for this user (RLS filters the rest) refreshes the list at once.
    const supabase = createBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      if (cancelled || !userId) return;
      channel = supabase
        .channel(`notifications:${userId}:${instanceId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => void load())
        .subscribe();
    });
    // Catch up on anything missed while the tab was hidden or the socket dropped.
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', visible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', visible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load, instanceId]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

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
        <div id={listId} className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-2 shadow-lg">
          {items.length === 0 ? (
            <p className="p-3 text-sm text-ink-muted">{t({ en: 'No notifications yet.', vi: 'Chưa có thông báo nào.' })}</p>
          ) : (
            <ul className="flex max-h-96 flex-col overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link prefetch={false} href={n.link ?? '#'} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-2.5 text-sm hover:bg-surface-sunken ${n.read ? 'text-ink-muted' : 'font-semibold text-ink'}`}>
                    {t(n.title)}
                    <span className="block text-xs font-normal text-ink-muted">{new Date(n.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
