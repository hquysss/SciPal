'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';

const OnlineContext = createContext<ReadonlySet<string>>(new Set());

/** Who is on SciPal right now: one shared Realtime presence channel, keyed by user id. Outside a provider nobody shows as online. */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let live = true;
    let supabase: ReturnType<typeof createBrowserClient>;
    try {
      supabase = createBrowserClient();
    } catch {
      return; // no Supabase configured: nobody shows as online
    }
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getSession().then(({ data }) => {
      const me = data.session?.user.id;
      if (!live || !me) return;
      channel = supabase.channel('presence:online', { config: { presence: { key: me } } });
      channel
        .on('presence', { event: 'sync' }, () => {
          if (live && channel) setOnline(new Set(Object.keys(channel.presenceState())));
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') void channel?.track({ at: Date.now() });
        });
    }).catch(() => undefined);
    return () => {
      live = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}

/** An avatar with a corner dot: green and gently pulsing when the person is online, grey when not. No id or no provider draws nothing. */
export function PresenceAvatar({ userId, children }: { userId?: string | null; children: ReactNode }) {
  const { t } = useLanguage();
  const online = useContext(OnlineContext);
  if (!userId) return <>{children}</>;
  const on = online.has(userId);
  return (
    <span className="relative inline-flex shrink-0">
      {children}
      <span
        title={on ? t({ en: 'Online', vi: 'Đang hoạt động' }) : t({ en: 'Offline', vi: 'Ngoại tuyến' })}
        className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-surface"
      >
        {on && <span aria-hidden="true" className="absolute size-2.5 animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />}
        <span aria-hidden="true" className={`relative size-2.5 rounded-full ${on ? 'bg-success' : 'bg-ink-muted opacity-60'}`} />
        <span className="sr-only">{on ? t({ en: 'Online', vi: 'Đang hoạt động' }) : t({ en: 'Offline', vi: 'Ngoại tuyến' })}</span>
      </span>
    </span>
  );
}
