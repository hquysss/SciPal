'use client';

import { useState, type ReactNode } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatClass } from './chatApi';
import type { FriendEntry } from '../friends/friendsApi';
import { PresenceAvatar } from './presence';

type Bilingual = { vi: string; en: string };
/** What the right-hand pane shows. `room: null` is the room everyone shares. */
export type Conversation = { kind: 'room'; grade: number | null } | { kind: 'class'; id: string } | { kind: 'dm'; id: string } | { kind: 'friends' };

export type ConversationData = {
  /** Grade rooms the reader may enter; empty until they pick a grade. */
  grades: number[];
  classes: ChatClass[];
  friends: FriendEntry[];
  /** Friend requests waiting for the reader. */
  incoming: number;
  /** Pictures of the shared rooms, by room key ("all", "10"…); missing means the coloured icon. */
  roomAvatars?: Record<string, string>;
};

export const GRADES = [10, 11, 12];

const keyOf = (c: Conversation) => (c.kind === 'room' ? `room:${c.grade ?? 'all'}` : c.kind === 'friends' ? 'friends' : `${c.kind}:${c.id}`);
const sameConversation = (a: Conversation | null, b: Conversation) => a !== null && keyOf(a) === keyOf(b);

function Row({ name, line, tag, avatar, active, onOpen }: { name: string; line: string; tag?: string; avatar: ReactNode; active: boolean; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-current={active ? 'true' : undefined}
        onClick={onOpen}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${active ? 'bg-surface-sunken' : 'hover:bg-surface-sunken'}`}
      >
        {avatar}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-ink">{name}</span>
          <span className="truncate text-xs text-ink-muted">{line}</span>
          {tag && <span className="mt-1 w-fit rounded-full border border-line px-2 text-xs font-medium text-ink-muted">{tag}</span>}
        </span>
      </button>
    </li>
  );
}

const Initial = ({ name, url }: { name: string; url?: string | null }) =>
  // eslint-disable-next-line @next/next/no-img-element
  url ? <img src={url} alt="" className="size-12 shrink-0 rounded-xl object-cover" /> : (
    <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-base font-bold text-ink">
      {name.trim().slice(0, 1).toUpperCase() || '?'}
    </span>
  );

/** Each room gets its own theme colour, so the list is not a column of identical grey icons. */
const TONES = ['--action', '--sky', '--sun', '--coral', '--success'] as const;
const ROOM_TONE = (grade: number | null) => (grade === null ? TONES[0] : TONES[1 + ((grade - 10) % 3 + 3) % 3]);

const GroupIcon = ({ tone, src }: { tone: (typeof TONES)[number]; src?: string }) =>
  src && src.startsWith('https://') ? (
    // eslint-disable-next-line @next/next/no-img-element -- media store image
    <img src={src} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
  ) : (
  <span
    aria-hidden="true"
    style={{ background: `color-mix(in srgb, var(${tone}) 26%, var(--surface))`, color: `color-mix(in srgb, var(${tone}) 70%, var(--ink))` }}
    className="flex size-12 shrink-0 items-center justify-center rounded-xl"
  >
    <Users className="size-5" />
  </span>
  );

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="px-3 pt-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{title}</h3>
      <ul className="flex flex-col gap-1">{children}</ul>
    </section>
  );
}

/** The left column of the messenger: the shared rooms, class chats and friends, filtered by the search box. */
export function ConversationList({ data, error, active, onOpen, onChooseGrade }: {
  data: ConversationData | null;
  error: Bilingual | null;
  active: Conversation | null;
  onOpen: (conversation: Conversation) => void;
  onChooseGrade: (grade: number) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const q = query.trim().toLocaleLowerCase('vi');
  const matches = (name: string) => q === '' || name.toLocaleLowerCase('vi').includes(q);
  const fallbackName = t({ en: 'User', vi: 'Người dùng' });

  const rooms = [null, ...(data?.grades ?? [])].map((grade) => ({
    grade,
    name: grade === null ? t({ en: 'Everyone', vi: 'Tất cả' }) : t({ en: `Grade ${grade}`, vi: `Khối ${grade}` }),
  })).filter((r) => matches(r.name));
  const classes = (data?.classes ?? []).filter((c) => matches(c.name));
  const friends = (data?.friends ?? []).map((f) => ({ ...f, name: f.display_name?.trim() || fallbackName })).filter((f) => matches(f.name));
  const total = 1 + (data?.grades.length ?? 0) + (data?.classes.length ?? 0) + (data?.friends.length ?? 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-line px-5 py-4">
        <h2 className="text-lg font-bold text-ink">{t({ en: 'Messages', vi: 'Tin nhắn' })}</h2>
        {data && <span className="rounded-full bg-surface-sunken px-2 text-xs font-semibold text-ink">{total}</span>}
        <Button
          type="button"
          size="icon"
          className="ml-auto size-9 min-h-9 rounded-full"
          aria-label={data?.incoming ? t({ en: `Find friends (${data.incoming} requests)`, vi: `Tìm bạn (${data.incoming} lời mời)` }) : t({ en: 'Find friends', vi: 'Tìm bạn' })}
          onClick={() => onOpen({ kind: 'friends' })}
        >
          <Plus aria-hidden="true" />
        </Button>
      </header>

      <div className="px-4 pt-4">
        <label className="relative block">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t({ en: 'Search conversations', vi: 'Tìm cuộc trò chuyện' })}
            placeholder={t({ en: 'Search conversations', vi: 'Tìm cuộc trò chuyện' })}
            className="rounded-xl border-transparent bg-surface-sunken pl-9"
          />
        </label>
      </div>

      <nav aria-label={t({ en: 'Conversations', vi: 'Cuộc trò chuyện' })} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 py-3">
        {error && <div className="px-2"><Alert tone="danger">{t(error)}</Alert></div>}
        {!data && !error && <p role="status" className="px-3 text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>}
        {data && (
          <>
            {rooms.length > 0 && (
              <Group title={t({ en: 'Rooms', vi: 'Phòng' })}>
                {rooms.map((r) => (
                  <Row
                    key={r.grade ?? 'all'}
                    name={r.name}
                    line={r.grade === null ? t({ en: 'Everyone on SciPal', vi: 'Mọi người trên SciPal' }) : t({ en: `Students in grade ${r.grade}`, vi: `Học sinh khối ${r.grade}` })}
                    tag={r.grade === null ? t({ en: 'Public', vi: 'Công khai' }) : t({ en: 'Grade room', vi: 'Phòng khối' })}
                    avatar={<GroupIcon tone={ROOM_TONE(r.grade)} src={data.roomAvatars?.[r.grade === null ? 'all' : String(r.grade)]} />}
                    active={sameConversation(active, { kind: 'room', grade: r.grade })}
                    onOpen={() => onOpen({ kind: 'room', grade: r.grade })}
                  />
                ))}
              </Group>
            )}
            {data.grades.length === 0 && q === '' && (
              <div className="mx-3 flex flex-col gap-2 rounded-xl border border-line p-3">
                <p className="text-xs text-ink-muted">{t({ en: 'Which grade are you in? Pick one to join your grade room.', vi: 'Bạn học khối mấy? Chọn để vào phòng của khối.' })}</p>
                <div className="flex gap-2">
                  {GRADES.map((grade) => (
                    <Button key={grade} type="button" variant="outline" className="flex-1 px-2" onClick={() => onChooseGrade(grade)}>
                      {t({ en: `Grade ${grade}`, vi: `Khối ${grade}` })}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {classes.length > 0 && (
              <Group title={t({ en: 'Classes', vi: 'Lớp học' })}>
                {classes.map((c) => (
                  <Row key={c.id} name={c.name} line={t({ en: 'Teacher and classmates', vi: 'Thầy cô và các bạn trong lớp' })} tag={t({ en: 'Class', vi: 'Lớp' })} avatar={<GroupIcon tone="--success" />}
                    active={sameConversation(active, { kind: 'class', id: c.id })} onOpen={() => onOpen({ kind: 'class', id: c.id })} />
                ))}
              </Group>
            )}
            {friends.length > 0 && (
              <Group title={t({ en: 'Friends', vi: 'Bạn bè' })}>
                {friends.map((f) => (
                  <Row key={f.id} name={f.name} line={t({ en: 'Direct message', vi: 'Tin nhắn riêng' })} avatar={<PresenceAvatar userId={f.user_id}><Initial name={f.name} url={f.avatar_url} /></PresenceAvatar>}
                    active={sameConversation(active, { kind: 'dm', id: f.id })} onOpen={() => onOpen({ kind: 'dm', id: f.id })} />
                ))}
              </Group>
            )}
            {q !== '' && rooms.length + classes.length + friends.length === 0 && (
              <p className="px-3 text-sm text-ink-muted">{t({ en: 'Nothing matches.', vi: 'Không có cuộc trò chuyện nào khớp.' })}</p>
            )}
            {q === '' && data.friends.length === 0 && (
              <button type="button" onClick={() => onOpen({ kind: 'friends' })} className="mx-3 rounded-xl border border-dashed border-line p-3 text-left text-xs text-ink-muted hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                {t({ en: 'No friends yet. Find a classmate to message.', vi: 'Chưa có bạn bè. Tìm bạn cùng lớp để nhắn tin.' })}
              </button>
            )}
          </>
        )}
      </nav>
    </div>
  );
}
