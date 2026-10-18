'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import type { ApiResult } from '../authoring/apiClient';
import { blockUser } from '../community/chatApi';
import { BlockedList } from './BlockedList';
import {
  acceptRequest, listFriends, removeFriendship, searchUsers, sendRequest,
  type FriendEntry, type FriendsList, type SearchUser,
} from './friendsApi';

type Bilingual = { vi: string; en: string };
export type FriendsState =
  | { status: 'loading' }
  | { status: 'error'; message: Bilingual }
  | ({ status: 'ready'; results: SearchUser[] | null } & FriendsList);

const SEARCH_MIN = 2;

function Avatar({ name, url }: { name: string; url: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  return (
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-sm font-bold text-ink">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Person({ name, url, children }: { name: string; url: string | null; children: ReactNode }) {
  return (
    <li className="flex min-h-14 items-center gap-3 py-2">
      <Avatar name={name} url={url} />
      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{name}</span>
      <span className="flex shrink-0 items-center gap-2">{children}</span>
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <ul className="flex flex-col divide-y divide-line">{children}</ul>
    </section>
  );
}

export function FriendsTabView({ state, onSearch, onSend, onAccept, onRemove, onMessage, onBlock }: {
  state: FriendsState;
  onSearch: (q: string) => void;
  onSend: (userId: string) => void;
  onAccept: (id: string) => void;
  onRemove: (id: string) => void;
  onMessage: (friendshipId: string) => void;
  onBlock: (userId: string) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  // Blocking has no undo yet, so it takes two clicks.
  const [confirmBlock, setConfirmBlock] = useState<string | null>(null);
  const fallbackName = t({ en: 'User', vi: 'Người dùng' });
  const nameOf = (p: { display_name: string | null }) => p.display_name?.trim() || fallbackName;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (q.length >= SEARCH_MIN) onSearch(q);
  };

  const relationLabel: Record<Exclude<SearchUser['relation'], 'none'>, Bilingual> = {
    friend: { en: 'Friends', vi: 'Đã là bạn' },
    pending_out: { en: 'Request sent', vi: 'Đã gửi lời mời' },
    pending_in: { en: 'Waiting for you', vi: 'Chờ bạn trả lời' },
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} role="search" className="flex gap-2">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t({ en: 'Find people by name', vi: 'Tìm người theo tên' })}
          placeholder={t({ en: 'Find people by name', vi: 'Tìm người theo tên' })}
        />
        <Button type="submit"><Search aria-hidden="true" />{t({ en: 'Search', vi: 'Tìm' })}</Button>
      </form>

      {state.status === 'loading' && <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>}
      {state.status === 'error' && <Alert tone="danger">{t(state.message)}</Alert>}

      {state.status === 'ready' && (
        <>
          {state.results && (
            state.results.length === 0 ? (
              <p className="text-sm text-ink-muted">{t({ en: 'No one found with that name.', vi: 'Không tìm thấy ai có tên này.' })}</p>
            ) : (
              <Section title={t({ en: 'Search results', vi: 'Kết quả tìm kiếm' })}>
                {state.results.map((u) => (
                  <Person key={u.user_id} name={nameOf(u)} url={u.avatar_url}>
                    {u.relation === 'none'
                      ? <Button type="button" onClick={() => onSend(u.user_id)}>{t({ en: 'Add friend', vi: 'Kết bạn' })}</Button>
                      : <Badge variant="secondary">{t(relationLabel[u.relation])}</Badge>}
                    {confirmBlock === u.user_id
                      ? <Button type="button" variant="destructive" onClick={() => { setConfirmBlock(null); onBlock(u.user_id); }}>{t({ en: 'Sure? Block', vi: 'Chắc chắn chặn?' })}</Button>
                      : <Button type="button" variant="outline" onClick={() => setConfirmBlock(u.user_id)}>{t({ en: 'Block', vi: 'Chặn' })}</Button>}
                  </Person>
                ))}
              </Section>
            )
          )}

          {state.incoming.length > 0 && (
            <Section title={t({ en: 'Friend requests', vi: 'Lời mời kết bạn' })}>
              {state.incoming.map((p) => (
                <Person key={p.id} name={nameOf(p)} url={p.avatar_url}>
                  <Button type="button" onClick={() => onAccept(p.id)}>{t({ en: 'Accept', vi: 'Chấp nhận' })}</Button>
                  <Button type="button" variant="outline" onClick={() => onRemove(p.id)}>{t({ en: 'Decline', vi: 'Từ chối' })}</Button>
                </Person>
              ))}
            </Section>
          )}

          {state.outgoing.length > 0 && (
            <Section title={t({ en: 'Requests you sent', vi: 'Lời mời đã gửi' })}>
              {state.outgoing.map((p) => (
                <Person key={p.id} name={nameOf(p)} url={p.avatar_url}>
                  <Button type="button" variant="outline" onClick={() => onRemove(p.id)}>{t({ en: 'Cancel request', vi: 'Huỷ lời mời' })}</Button>
                </Person>
              ))}
            </Section>
          )}

          {state.friends.length === 0 ? (
            <EmptyState
              title={t({ en: 'No friends yet', vi: 'Chưa có bạn bè' })}
              description={t({ en: 'Search for a classmate by name and send a request.', vi: 'Tìm bạn cùng lớp theo tên rồi gửi lời mời kết bạn.' })}
            />
          ) : (
            <Section title={t({ en: 'Friends', vi: 'Bạn bè' })}>
              {state.friends.map((p) => (
                <Person key={p.id} name={nameOf(p)} url={p.avatar_url}>
                  <Button type="button" onClick={() => onMessage(p.id)}>{t({ en: 'Message', vi: 'Nhắn tin' })}</Button>
                  <Button type="button" variant="outline" onClick={() => onRemove(p.id)}>{t({ en: 'Unfriend', vi: 'Huỷ kết bạn' })}</Button>
                </Person>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/** Finding people and handling requests; `onDm` opens the chat with a friend (the community page shows it). */
export function FriendsTab({ onDm }: { onDm?: (friendshipId: string | null) => void }) {
  const [state, setState] = useState<FriendsState>({ status: 'loading' });
  const [notice, setNotice] = useState<Bilingual | null>(null);
  const [blockVersion, setBlockVersion] = useState(0);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    const result = await listFriends();
    setState((prev) => result.ok
      ? { status: 'ready', results: prev.status === 'ready' ? prev.results : null, ...result.data }
      : { status: 'error', message: result.error });
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Runs a write, then refreshes the lists; a refusal is shown, not swallowed. */
  const act = async (call: Promise<ApiResult<unknown>>) => {
    const result = await call;
    setNotice(result.ok ? null : result.error);
    await load();
    return result.ok;
  };

  const search = async (q: string) => {
    const result = await searchUsers(q);
    if (!result.ok) return setNotice(result.error);
    setNotice(null);
    setState((prev) => (prev.status === 'ready' ? { ...prev, results: result.data.users } : prev));
  };

  const send = async (userId: string) => {
    // Re-run the search afterwards so the row flips to "request sent".
    if (await act(sendRequest(userId))) {
      setState((prev) => prev.status === 'ready' && prev.results
        ? { ...prev, results: prev.results.map((u) => (u.user_id === userId ? { ...u, relation: 'pending_out' as const } : u)) }
        : prev);
    }
  };

  const block = async (userId: string) => {
    if (!(await act(blockUser(userId)))) return;
    setBlockVersion((v) => v + 1);
    setState((prev) => (prev.status === 'ready' && prev.results ? { ...prev, results: prev.results.filter((u) => u.user_id !== userId) } : prev));
  };

  return (
    <div className="flex flex-col gap-4">
      {notice && <Alert tone="danger">{t(notice)}</Alert>}
      <FriendsTabView
        state={state}
        onSearch={(q) => void search(q)}
        onSend={(id) => void send(id)}
        onAccept={(id) => void act(acceptRequest(id))}
        onRemove={(id) => void act(removeFriendship(id))}
        onMessage={(id) => onDm?.(id)}
        onBlock={(id) => void block(id)}
      />
      <BlockedList version={blockVersion} />
    </div>
  );
}
