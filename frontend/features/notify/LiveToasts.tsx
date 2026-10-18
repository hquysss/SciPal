'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, MessageCircle, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { isConversationOnScreen } from '@/features/community/unread';
import styles from './liveToasts.module.css';

type Bilingual = { vi: string; en: string };
type Toast = { id: string; tone: 'message' | 'notice'; title: Bilingual; sub: Bilingual; href: string };

const SHOW_MS = 6000;
const MAX = 3;
const WAVE = 'M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L0,320Z';

/** A short two-note chime made on the spot (no audio file). Browsers stay silent until the reader has clicked the page once. */
let audio: AudioContext | null = null;
let lastChime = 0;
function chime() {
  const now = Date.now();
  if (now - lastChime < 1500) return; // a burst plays once
  lastChime = now;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const t0 = audio.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t0 + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(audio!.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // No Web Audio: the card alone is enough.
  }
}

/** Where a chat message lives, as its read key and the Community link that opens it. */
function chatPlace(row: Record<string, unknown>): { key: string; href: string; kind: 'dm' | 'class' | 'room' } {
  if (typeof row.friendship_id === 'string') return { key: `dm:${row.friendship_id}`, href: `/community?tab=friends&dm=${encodeURIComponent(row.friendship_id)}`, kind: 'dm' };
  if (typeof row.class_id === 'string') return { key: `class:${row.class_id}`, href: `/community?tab=classes&class=${encodeURIComponent(row.class_id)}`, kind: 'class' };
  const room = row.community ? 'all' : String(row.room_grade);
  return { key: room, href: `/community?room=${room}`, kind: 'room' };
}

/**
 * Pops a card with a chime when something new arrives while the reader is on SciPal: a bell notification, or a
 * direct or class message in a chat they are not looking at. Shared rooms only bump the unread count, or a busy
 * room would ring all day.
 */
export function LiveToasts() {
  const { t } = useLanguage();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((toast: Toast) => {
    setToasts((prev) => [toast, ...prev.filter((x) => x.id !== toast.id)].slice(0, MAX));
    timers.current.set(toast.id, setTimeout(() => dismiss(toast.id), SHOW_MS));
    chime();
  }, [dismiss]);

  useEffect(() => {
    let live = true;
    let supabase: ReturnType<typeof createBrowserClient>;
    try {
      supabase = createBrowserClient();
    } catch {
      return; // no Supabase configured
    }
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getSession().then(({ data }) => {
      const me = data.session?.user.id;
      if (!live || !me) return;
      channel = supabase.channel(`live-toasts:${me}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me}` }, ({ new: row }) => {
          push({
            id: `n:${String(row.id)}`, tone: 'notice',
            title: { vi: String(row.title_vi ?? ''), en: String(row.title_en || row.title_vi || '') },
            sub: { vi: 'Thông báo mới', en: 'New notification' },
            href: typeof row.link === 'string' && row.link.startsWith('/') ? row.link : '/',
          });
        })
        // RLS sends only messages the reader may see.
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, ({ new: row }) => {
          if (row.sender_id === me) return;
          const place = chatPlace(row);
          if (place.kind === 'room' || isConversationOnScreen(place.key)) return;
          const name = String(row.sender_name || '').trim() || 'Người dùng';
          const body = String(row.body ?? '').trim();
          push({
            id: `m:${String(row.id)}`, tone: 'message',
            title: { vi: name, en: name },
            sub: body ? { vi: body, en: body } : { vi: 'Đã gửi một ảnh', en: 'Sent a picture' },
            href: place.href,
          });
        })
        .subscribe();
    }).catch(() => undefined);
    const pending = timers.current;
    return () => {
      live = false;
      pending.forEach(clearTimeout);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [push]);

  return (
    <div role="status" aria-live="polite" className={styles.stack}>
      {toasts.map((toast) => (
        <div key={toast.id} className={styles.card} data-tone={toast.tone}>
          <svg className={styles.wave} viewBox="0 0 1440 320" aria-hidden="true"><path d={WAVE} /></svg>
          <span className={styles.icon} aria-hidden="true">
            {toast.tone === 'message' ? <MessageCircle className="size-[18px]" /> : <Bell className="size-[18px]" />}
          </span>
          <Link prefetch={false} href={toast.href} onClick={() => dismiss(toast.id)} className={styles.text}>
            <span className={styles.title}>{t(toast.title)}</span>
            <span className={styles.sub}>{t(toast.sub)}</span>
          </Link>
          <button type="button" onClick={() => dismiss(toast.id)} aria-label={t({ en: 'Close', vi: 'Đóng' })} className={styles.close}>
            <X aria-hidden="true" className="size-[18px]" />
          </button>
        </div>
      ))}
    </div>
  );
}
