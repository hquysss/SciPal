'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, Camera, Flag, MessageCircle, UserPlus, UserRound, MoreHorizontal, Paperclip, Reply, SmilePlus, Undo2, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { REACTIONS, blockUser, removeRoomAvatar, reportMessage, uploadRoomAvatar, reactToMessage, recallMessage, reportConversation, sendImage, sendMessage, type ChatMessage, type ChatSender, type ChatTarget, type ReactionChip } from './chatApi';
import { groupMessages } from './chatLayout';
import roleColors from '../../components/ui/roleColors.module.css';
import { PresenceAvatar } from './presence';
import { SendButton } from './SendButton';
import { useChatRoom } from './useChatRoom';
import { markChatRead, registerOpenConversation } from './unread';
import { sendRequest } from '../friends/friendsApi';

type Bilingual = { vi: string; en: string };
const BODY_MAX = 500;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const IMAGE_MAX = 1.5 * 1024 * 1024;
// The Vietnamese text is what moderators read; the English is only for the reporter.
const REASONS: Bilingual[] = [
  { vi: 'Quấy rối', en: 'Harassment' },
  { vi: 'Spam', en: 'Spam' },
  { vi: 'Nội dung không phù hợp', en: 'Inappropriate content' },
  { vi: 'Khác', en: 'Other' },
];

/** The address was written by our own server, but only https ever reaches an <img> or a link. */
const isHttps = (url: string | null): url is string => typeof url === 'string' && url.startsWith('https://');

function Avatar({ name, url, className = 'size-10 text-sm' }: { name: string; url?: string | null; className?: string }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-sunken font-bold text-ink ${className}`}>
      {isHttps(url ?? null)
        // eslint-disable-next-line @next/next/no-img-element -- media store image
        ? <img src={url as string} alt="" className="size-full object-cover" />
        : name.trim().slice(0, 1).toUpperCase() || '?'}
    </span>
  );
}

const SKELETON = [
  { mine: false, widths: ['w-48', 'w-32'] },
  { mine: true, widths: ['w-40'] },
  { mine: false, widths: ['w-56'] },
  { mine: true, widths: ['w-28', 'w-44'] },
  { mine: false, widths: ['w-36'] },
];

/** Grey bubbles in the shape of a conversation while messages load; still under reduced motion. */
function MessageSkeleton({ rows = SKELETON.length }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      {SKELETON.slice(0, rows).map((row, i) => (
        <div key={i} className={`flex items-start gap-4 ${row.mine ? 'flex-row-reverse' : ''}`}>
          <span className="size-10 shrink-0 rounded-xl bg-surface-sunken motion-safe:animate-pulse" />
          <span className={`flex flex-col gap-2 ${row.mine ? 'items-end' : 'items-start'}`}>
            {row.widths.map((w) => <span key={w} className={`h-9 rounded-xl bg-surface-sunken motion-safe:animate-pulse ${w}`} />)}
          </span>
        </div>
      ))}
    </div>
  );
}

const MENU_ITEM = 'flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus';

/** What you can do with a sender: see their profile, message them (friends) or add them, or block them (asks twice). */
function SenderMenu({ userId, friendshipId, confirmBlock, onClose, onOpenDm, onAddFriend, onAskBlock, onBlock }: {
  userId: string;
  friendshipId?: string;
  confirmBlock: boolean;
  onClose: () => void;
  onOpenDm?: (friendshipId: string) => void;
  onAddFriend?: (userId: string) => void;
  onAskBlock: () => void;
  onBlock: () => void;
}) {
  const { t } = useLanguage();
  const [asked, setAsked] = useState(false);
  return (
    <span role="menu" onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className="chat-pop absolute left-0 top-12 z-30 flex min-w-48 origin-top-left flex-col rounded-xl border border-line bg-surface p-1 shadow-lg">
      <Link role="menuitem" href={`/community/u/${userId}`} className={`${MENU_ITEM} text-ink`}><UserRound aria-hidden="true" className="size-4" />{t({ en: 'View profile', vi: 'Xem hồ sơ' })}</Link>
      {friendshipId && onOpenDm && (
        <button type="button" role="menuitem" onClick={() => { onClose(); onOpenDm(friendshipId); }} className={`${MENU_ITEM} text-ink`}><MessageCircle aria-hidden="true" className="size-4" />{t({ en: 'Message', vi: 'Nhắn tin' })}</button>
      )}
      {!friendshipId && onAddFriend && (
        <button type="button" role="menuitem" disabled={asked} onClick={() => { setAsked(true); onAddFriend(userId); }} className={`${MENU_ITEM} text-ink disabled:opacity-60`}>
          <UserPlus aria-hidden="true" className="size-4" />{asked ? t({ en: 'Request sent', vi: 'Đã gửi lời mời' }) : t({ en: 'Add friend', vi: 'Kết bạn' })}
        </button>
      )}
      {confirmBlock
        ? <button type="button" role="menuitem" onClick={onBlock} className={`${MENU_ITEM} text-danger`}><Ban aria-hidden="true" className="size-4" />{t({ en: 'Sure? Block', vi: 'Chắc chắn chặn?' })}</button>
        : <button type="button" role="menuitem" onClick={onAskBlock} className={`${MENU_ITEM} text-ink`}><Ban aria-hidden="true" className="size-4" />{t({ en: 'Block', vi: 'Chặn' })}</button>}
    </span>
  );
}

/** An admin's room picture: click to choose a new one, and a small button to put the plain icon back. */
function RoomAvatarPicker({ name, url, onChange }: { name: string; url: string | null; onChange: (file: File | null) => void }) {
  const { t } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onChange(file);
  };
  return (
    <span className="relative inline-flex shrink-0">
      <button type="button" onClick={() => input.current?.click()} aria-label={t({ en: 'Change room picture', vi: 'Đổi ảnh phòng' })} title={t({ en: 'Change room picture', vi: 'Đổi ảnh phòng' })}
        className="group relative rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
        <Avatar name={name} url={url} className="size-10 text-base" />
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center rounded-xl bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] text-surface opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100"><Camera className="size-4" /></span>
      </button>
      {url && (
        <button type="button" onClick={() => onChange(null)} aria-label={t({ en: 'Remove room picture', vi: 'Gỡ ảnh phòng' })} title={t({ en: 'Remove room picture', vi: 'Gỡ ảnh phòng' })}
          className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-line bg-surface text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"><X aria-hidden="true" className="size-3" /></button>
      )}
      <input ref={input} type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" tabIndex={-1} onChange={pick} />
    </span>
  );
}

export function ChatPaneView({ messages, meId, onSend, onSendImage, onReport, onBlock, onReact, onRecall, senders = {}, loading = false, hasOlder = false, loadingOlder = false, onLoadOlder, reactions = {}, title, subtitle, peerId, roomAvatar, onChangeRoomAvatar, onReportMessage, friendships = {}, onOpenDm, onAddFriend, onBack, backAlways = false, showNames = true, now }: {
  messages: ChatMessage[];
  meId: string | null;
  /** Resolves true when the message went through, so the box can clear. */
  onSend: (body: string, replyTo?: string) => Promise<boolean>;
  /** Present only where pictures are allowed (direct messages). */
  onSendImage?: (file: File, caption: string) => Promise<boolean>;
  /** Reports the whole conversation, not one message. */
  onReport: (reason: string) => void;
  onBlock: (userId: string) => void;
  /** Toggles one emoji on a message; the picker is hidden where this is absent. */
  onReact?: (messageId: string, emoji: string) => void;
  reactions?: Record<string, ReactionChip[]>;
  /** Unsends one of your own messages; the menu item is hidden where this is absent. */
  onRecall?: (messageId: string) => void;
  /** Picture and role by sender id; a sender not listed yet shows the plain initial. */
  senders?: Record<string, ChatSender>;
  /** First load still running: skeleton bubbles instead of the empty note. */
  loading?: boolean;
  hasOlder?: boolean;
  loadingOlder?: boolean;
  /** Asked for when the reader scrolls near the top. */
  onLoadOlder?: () => void;
  title?: string;
  subtitle?: string;
  /** The other person in a direct chat, for the online dot. */
  peerId?: string;
  /** A shared room's picture; with `onChangeRoomAvatar` (admins) the header avatar becomes a picker. */
  roomAvatar?: string | null;
  onChangeRoomAvatar?: (file: File | null) => void;
  /** Report one person's message (from its ⋯ menu) with a fixed reason. */
  onReportMessage?: (messageId: string, reason: string) => void;
  /** Friends by user id, to their friendship id: a friend gets "Message", anyone else "Add friend". */
  friendships?: Record<string, string>;
  onOpenDm?: (friendshipId: string) => void;
  onAddFriend?: (userId: string) => void;
  onBack?: () => void;
  /** Keep the back button on wide screens too (the floating panel). */
  backAlways?: boolean;
  /** Group chats name each sender; a two-person chat does not need to. */
  showNames?: boolean;
  now?: Date;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<Bilingual | null>(null);
  const [reporting, setReporting] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const [reportingMsg, setReportingMsg] = useState<ChatMessage | null>(null);
  const [recalling, setRecalling] = useState<ChatMessage | null>(null);
  const log = useRef<HTMLDivElement>(null);

  // Jump to the bottom only when the newest message changes; an older page keeps the reader where they were.
  const newest = messages[messages.length - 1]?.id;
  const oldestId = messages[0]?.id;
  const keepFromBottom = useRef<number | null>(null);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [newest]);
  useLayoutEffect(() => {
    if (log.current && keepFromBottom.current !== null) log.current.scrollTop = log.current.scrollHeight - keepFromBottom.current;
    keepFromBottom.current = null;
  }, [oldestId]);
  const onScroll = () => {
    const el = log.current;
    if (!el || !onLoadOlder || !hasOlder || loadingOlder || el.scrollTop > 80) return;
    keepFromBottom.current = el.scrollHeight - el.scrollTop;
    onLoadOlder();
  };

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    if (!IMAGE_TYPES.includes(picked.type)) {
      setFile(null);
      return setFileError({ en: 'Only PNG, JPG or WEBP pictures.', vi: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.' });
    }
    if (picked.size > IMAGE_MAX) {
      setFile(null);
      return setFileError({ en: 'Pictures are up to 1.5 MB.', vi: 'Ảnh tối đa 1,5 MB.' });
    }
    setFileError(null);
    setFile(picked);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const body = draft.trim();
    if (!body && !file) return;
    setSending(true);
    try {
      if (file && onSendImage) {
        if (await onSendImage(file, body)) {
          setFile(null);
          setDraft('');
        }
      } else if (await onSend(body, replyTo?.id)) {
        setDraft('');
        setReplyTo(null);
      }
    } finally {
      setSending(false);
    }
  };

  const groups = groupMessages(messages, now);
  const byId = new Map(messages.map((m) => [m.id, m]));
  const snippet = (m: ChatMessage) => (m.recalled_at ? t({ en: 'Unsent message', vi: 'Tin đã thu hồi' }) : m.body || t({ en: 'Picture', vi: 'Ảnh' }));

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {title && (
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
          {onBack && (
            <Button type="button" variant="ghost" size="icon" className={backAlways ? '' : 'lg:hidden'} aria-label={t({ en: 'Back', vi: 'Quay lại' })} onClick={onBack}><ArrowLeft aria-hidden="true" /></Button>
          )}
          {onChangeRoomAvatar ? (
            <RoomAvatarPicker name={title} url={roomAvatar ?? null} onChange={onChangeRoomAvatar} />
          ) : (
            <PresenceAvatar userId={peerId}><Avatar name={title} url={roomAvatar ?? null} className="size-10 text-base" /></PresenceAvatar>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-ink">{title}</h2>
            {subtitle && <p className="truncate text-xs font-medium text-ink-muted">{subtitle}</p>}
          </div>
          <Button type="button" variant="destructive" className="shrink-0 max-sm:size-11 max-sm:px-0" aria-label={t({ en: 'Report', vi: 'Báo cáo' })} onClick={() => setReporting(true)}>
            <Flag aria-hidden="true" /><span className="max-sm:hidden">{t({ en: 'Report', vi: 'Báo cáo' })}</span>
          </Button>
        </header>
      )}

      <div ref={log} role="log" aria-live="polite" aria-label={t({ en: 'Messages', vi: 'Tin nhắn' })} aria-busy={loading || loadingOlder} onScroll={onScroll} className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
        {loading && <MessageSkeleton />}
        {loadingOlder && <MessageSkeleton rows={2} />}
        {!loading && !hasOlder && messages.length > 0 && onLoadOlder && (
          <p className="text-center text-xs text-ink-muted">{t({ en: 'Start of the conversation', vi: 'Đầu cuộc trò chuyện' })}</p>
        )}
        {!loading && messages.length === 0 && <p className="m-auto text-sm text-ink-muted">{t({ en: 'No messages yet. Say hello!', vi: 'Chưa có tin nhắn nào. Chào mọi người nhé!' })}</p>}
        {groups.map((group) => {
          const mine = group.sender_id === meId;
          return (
            <div key={group.messages[0].id} className="flex flex-col gap-2">
              {group.timeLabel && <p className="mb-2 text-center text-xs font-medium text-ink-muted">{group.timeLabel}</p>}
              <div className={`relative flex items-start gap-4 ${mine ? 'flex-row-reverse' : ''}`}>
                {mine
                  ? <Avatar name={group.sender_name} url={senders[group.sender_id]?.avatar_url} />
                  : <button type="button" aria-label={group.sender_name} aria-haspopup="menu" aria-expanded={profileFor === group.messages[0].id} onClick={() => { setMenuFor(null); setConfirmBlock(null); setProfileFor(profileFor === group.messages[0].id ? null : group.messages[0].id); }} className="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"><PresenceAvatar userId={group.sender_id}><Avatar name={group.sender_name} url={senders[group.sender_id]?.avatar_url} /></PresenceAvatar></button>}
                {!mine && profileFor === group.messages[0].id && (
                  <SenderMenu
                    userId={group.sender_id}
                    friendshipId={friendships[group.sender_id]}
                    confirmBlock={confirmBlock === group.sender_id}
                    onClose={() => { setProfileFor(null); setConfirmBlock(null); }}
                    onOpenDm={onOpenDm}
                    onAddFriend={onAddFriend}
                    onAskBlock={() => setConfirmBlock(group.sender_id)}
                    onBlock={() => { setProfileFor(null); setConfirmBlock(null); onBlock(group.sender_id); }}
                  />
                )}
                <div className={`flex min-w-0 max-w-[80%] flex-col gap-2 ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && showNames && (
                    <span className="-mb-1 flex flex-wrap items-center gap-x-2">
                      <button type="button" aria-haspopup="menu" onClick={() => { setMenuFor(null); setConfirmBlock(null); setProfileFor(profileFor === group.messages[0].id ? null : group.messages[0].id); }} className="text-sm font-bold text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">{group.sender_name}</button>
                      {senders[group.sender_id] && (
                        <span className={`rounded-full border border-current px-2 text-xs font-semibold ${roleColors[senders[group.sender_id].role]}`}>
                          {senders[group.sender_id].role === 'admin' ? 'Admin' : senders[group.sender_id].role === 'teacher' ? t({ en: 'Teacher', vi: 'Giáo viên' }) : t({ en: 'Student', vi: 'Học sinh' })}
                        </span>
                      )}
                    </span>
                  )}
                  {group.messages.map((m) => {
                    if (m.recalled_at) {
                      return (
                        <p key={m.id} className="chat-in rounded-xl border border-line px-4 py-2 text-sm italic text-ink-muted">
                          {mine ? t({ en: 'You unsent a message', vi: 'Bạn đã thu hồi một tin nhắn' }) : t({ en: `${m.sender_name} unsent a message`, vi: `${m.sender_name} đã thu hồi một tin nhắn` })}
                        </p>
                      );
                    }
                    const chips = reactions[m.id] ?? [];
                    return (
                      <div key={m.id} className={`chat-in group relative flex items-center gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
                        <div className={`relative flex min-w-0 flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
                          {picking === m.id && onReact && (
                            <span role="group" aria-label={t({ en: 'Pick a reaction', vi: 'Chọn cảm xúc' })}
                              className={`chat-pop absolute bottom-full z-20 mb-1 flex gap-0.5 rounded-full border border-line bg-surface px-1.5 py-1 shadow-lg ${mine ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'}`}>
                              {REACTIONS.map((emoji) => (
                                <button key={emoji} type="button" aria-label={emoji} onClick={() => { setPicking(null); onReact(m.id, emoji); }}
                                  className="grid size-9 place-items-center rounded-full text-xl transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus motion-reduce:transition-none motion-reduce:hover:scale-100">{emoji}</button>
                              ))}
                            </span>
                          )}
                          {isHttps(m.image_url) && (
                            <button type="button" aria-label={t({ en: 'Enlarge picture', vi: 'Phóng to ảnh' })} onClick={() => setZoomed(m.image_url)} className="block overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                              <img src={m.image_url} alt={t({ en: 'Picture', vi: 'Ảnh' })} loading="lazy" className="max-h-60 max-w-full cursor-zoom-in object-cover" />
                            </button>
                          )}
                          {m.reply_to && (
                            <p className="max-w-full truncate rounded-lg border-l-2 border-line bg-surface-sunken px-2 py-1 text-xs text-ink-muted">
                              {byId.get(m.reply_to) ? `${byId.get(m.reply_to)!.sender_name}: ${snippet(byId.get(m.reply_to)!)}` : t({ en: 'Earlier message', vi: 'Tin trước đó' })}
                            </p>
                          )}
                          {m.body && (
                            <p className={`whitespace-pre-wrap break-words rounded-xl px-4 py-2 text-sm ${mine ? 'bg-action text-action-ink' : 'bg-surface-sunken text-ink'}`}>{m.body}</p>
                          )}
                          {chips.length > 0 && (
                            <span className={`flex gap-1.5 px-1 ${mine ? 'justify-end' : ''}`}>
                              {chips.map((chip) => (
                                <button key={chip.emoji} type="button" aria-pressed={chip.mine} disabled={!onReact} aria-label={`${chip.emoji} ${chip.count}`} onClick={() => onReact?.(m.id, chip.emoji)}
                                  className="chat-pop group/chip flex items-center gap-0.5 rounded text-xs leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                                  <span className={chip.mine ? '' : 'opacity-80'}>{chip.emoji}</span>
                                  <span className="hidden font-semibold text-ink-muted group-hover/chip:inline group-focus-visible/chip:inline">{chip.count}</span>
                                </button>
                              ))}
                            </span>
                          )}
                        </div>
                        <span className={`relative flex shrink-0 items-center transition-opacity duration-150 ${picking === m.id || menuFor === m.id ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100'}`}>
                          {onReact && <Button type="button" variant="ghost" size="icon" className="size-8 min-h-8 rounded-full text-ink-muted" aria-label={t({ en: 'React', vi: 'Thả cảm xúc' })} aria-expanded={picking === m.id} onClick={() => { setMenuFor(null); setPicking(picking === m.id ? null : m.id); }}><SmilePlus aria-hidden="true" /></Button>}
                          <Button type="button" variant="ghost" size="icon" className="size-8 min-h-8 rounded-full text-ink-muted" aria-label={t({ en: 'Reply', vi: 'Trả lời' })} onClick={() => setReplyTo(m)}><Reply aria-hidden="true" /></Button>
                          {(mine ? onRecall : onReportMessage) && (
                            <Button type="button" variant="ghost" size="icon" className="size-8 min-h-8 rounded-full text-ink-muted" aria-label={t({ en: 'More', vi: 'Thêm' })} aria-haspopup="menu" aria-expanded={menuFor === m.id}
                              onClick={() => { setPicking(null); setProfileFor(null); setMenuFor(menuFor === m.id ? null : m.id); }}><MoreHorizontal aria-hidden="true" /></Button>
                          )}
                          {menuFor === m.id && (
                            <span role="menu" onKeyDown={(e) => e.key === 'Escape' && setMenuFor(null)}
                              className={`chat-pop absolute top-full z-20 mt-1 flex min-w-36 flex-col rounded-xl border border-line bg-surface p-1 shadow-lg ${mine ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}>
                              {mine
                                ? <button type="button" role="menuitem" onClick={() => { setMenuFor(null); setRecalling(m); }} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-ink hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"><Undo2 aria-hidden="true" className="size-4" />{t({ en: 'Unsend', vi: 'Thu hồi' })}</button>
                                : <button type="button" role="menuitem" onClick={() => { setMenuFor(null); setReportingMsg(m); }} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-danger hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"><Flag aria-hidden="true" className="size-4" />{t({ en: 'Report', vi: 'Báo cáo' })}</button>}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
        {replyTo && (
          <div className="flex items-center gap-2 rounded-lg bg-surface-sunken px-3 py-1 text-xs text-ink-muted">
            <span className="min-w-0 flex-1 truncate">{t({ en: 'Replying to', vi: 'Trả lời' })} {replyTo.sender_name}: {snippet(replyTo)}</span>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={t({ en: 'Cancel reply', vi: 'Huỷ trả lời' })} onClick={() => setReplyTo(null)}><X aria-hidden="true" /></Button>
          </div>
        )}
        {fileError && <Alert tone="danger">{t(fileError)}</Alert>}
        {preview && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={t({ en: 'Picture to send', vi: 'Ảnh sắp gửi' })} className="h-16 w-16 rounded-lg object-cover" />
            <Button type="button" variant="outline" onClick={() => setFile(null)}>
              <X aria-hidden="true" />{t({ en: 'Remove picture', vi: 'Bỏ ảnh' })}
            </Button>
          </div>
        )}
        <form onSubmit={(e) => void submit(e)} className="flex items-center gap-3">
          {onSendImage && (
            <label className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
              <Paperclip aria-hidden="true" className="size-5" />
              <input type="file" accept={IMAGE_TYPES.join(',')} aria-label={t({ en: 'Attach a picture', vi: 'Đính kèm ảnh' })} onChange={choose} className="sr-only" />
            </label>
          )}
          <div className="flex min-h-12 flex-1 items-center rounded-xl border-2 border-line bg-surface pl-4 pr-1 focus-within:border-action">
            <input
              value={draft}
              maxLength={BODY_MAX}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={t({ en: 'Write a message', vi: 'Viết tin nhắn' })}
              placeholder={file ? t({ en: 'Add a caption (optional)', vi: 'Thêm chú thích (không bắt buộc)' }) : t({ en: 'Type a message', vi: 'Nhập tin nhắn' })}
              className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
            <SendButton label={t({ en: 'Send', vi: 'Gửi' })} sendingLabel={t({ en: 'Sending…', vi: 'Đang gửi…' })} sending={sending} disabled={draft.trim() === '' && !file} />
          </div>
        </form>
      </div>

      <Dialog open={reporting} onClose={() => setReporting(false)} title={t({ en: 'Why are you reporting this chat?', vi: 'Vì sao bạn báo cáo cuộc trò chuyện này?' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })}>
        <div className="flex flex-col gap-2">
          {REASONS.map((reason) => (
            <Button key={reason.vi} type="button" variant="outline" onClick={() => { setReporting(false); onReport(reason.vi); }}>
              {t(reason)}
            </Button>
          ))}
        </div>
      </Dialog>

      <Dialog open={recalling !== null} onClose={() => setRecalling(null)} title={t({ en: 'Unsend this message?', vi: 'Thu hồi tin nhắn này?' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })}>
        <p className="text-sm text-ink-muted">{t({ en: 'Everyone in the chat will see that you unsent a message.', vi: 'Mọi người trong cuộc trò chuyện sẽ thấy bạn đã thu hồi một tin nhắn.' })}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setRecalling(null)}>{t({ en: 'Cancel', vi: 'Huỷ' })}</Button>
          <Button type="button" variant="destructive" onClick={() => { if (recalling) onRecall?.(recalling.id); setRecalling(null); }}>{t({ en: 'Unsend', vi: 'Thu hồi' })}</Button>
        </div>
      </Dialog>

      <Dialog open={reportingMsg !== null} onClose={() => setReportingMsg(null)} title={t({ en: 'Why are you reporting this message?', vi: 'Vì sao bạn báo cáo tin nhắn này?' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })}>
        {reportingMsg && <p className="mb-3 line-clamp-3 rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink-muted">{reportingMsg.sender_name}: {snippet(reportingMsg)}</p>}
        <div className="flex flex-col gap-2">
          {REASONS.map((reason) => (
            <Button key={reason.vi} type="button" variant="outline" onClick={() => { if (reportingMsg) onReportMessage?.(reportingMsg.id, reason.vi); setReportingMsg(null); }}>
              {t(reason)}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-muted">{t({ en: 'Admins see the message and decide. The sender is not told who reported it.', vi: 'Admin sẽ xem tin nhắn và quyết định. Người gửi không biết ai đã báo cáo.' })}</p>
      </Dialog>

      <Dialog open={zoomed !== null} onClose={() => setZoomed(null)} title={t({ en: 'Picture', vi: 'Ảnh' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })} closeOnBackdrop className="max-w-3xl">
        {zoomed && (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomed} alt={t({ en: 'Picture', vi: 'Ảnh' })} className="max-h-[70dvh] max-w-full rounded-lg object-contain" />
            <a href={zoomed} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-action underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
              {t({ en: 'Open original', vi: 'Mở ảnh gốc' })}
            </a>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export function ChatPane({ target, title, subtitle, peerId, roomKey, roomAvatar, onRoomAvatar, friendships, onOpenDm, onBack, onBlocked, backAlways }: {
  target: ChatTarget;
  title?: string;
  subtitle?: string;
  /** The other person in a direct chat, for the online dot. */
  peerId?: string;
  /** A shared room ("all", "10"…) and its picture; admins can change the picture from the header. */
  roomKey?: string;
  roomAvatar?: string | null;
  onRoomAvatar?: () => void;
  /** Friends by user id (to friendship id), and how to open a direct chat with one. */
  friendships?: Record<string, string>;
  onOpenDm?: (friendshipId: string) => void;
  onBack?: () => void;
  onBlocked?: (userId: string) => void;
  backAlways?: boolean;
}) {
  const { t } = useLanguage();
  const [meId, setMeId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { messages, reactions, status, refreshReactions, senders, hasOlder, loadingOlder, loadOlder } = useChatRoom(target, meId);
  const [notice, setNotice] = useState<{ tone: 'danger' | 'info'; text: Bilingual } | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    createBrowserClient().auth.getSession().then(({ data }) => { setMeId(data.session?.user.id ?? null); setIsAdmin(data.session?.user.app_metadata?.app_role === 'admin'); }).catch(() => undefined);
  }, []);

  // Opening a conversation and each new message while it is on screen mark it read; touching it again
  // (after the bubble was hidden) catches up too.
  const root = useRef<HTMLDivElement>(null);
  const readKey = 'community' in target ? 'all' : 'room_grade' in target ? String(target.room_grade) : 'class_id' in target ? `class:${target.class_id}` : `dm:${target.friendship_id}`;
  const lastId = messages.at(-1)?.id;
  // The newest message already marked, so pointer and focus events do not ask the server again.
  const marked = useRef<string | null>(null);
  const markRead = () => {
    const seen = `${readKey}|${lastId ?? ''}`;
    if (status !== 'ready' || marked.current === seen || document.visibilityState !== 'visible' || root.current?.checkVisibility?.() === false) return;
    marked.current = seen;
    void markChatRead(readKey);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- markRead reads the same values
  useEffect(markRead, [status, lastId, readKey]);
  // A tab opened in the background marks the chat read once the reader switches to it.
  const latestMark = useRef(markRead);
  latestMark.current = markRead;
  useEffect(() => {
    const onVisible = () => latestMark.current();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  // While on screen, this conversation does not pop a toast for its own messages.
  useEffect(() => registerOpenConversation(readKey, root), [readKey]);

  const changeRoomAvatar = async (file: File | null) => {
    if (!roomKey) return;
    if (file && (!IMAGE_TYPES.includes(file.type) || file.size > IMAGE_MAX)) {
      setNotice({ tone: 'danger', text: { vi: 'Ảnh PNG, JPG hoặc WEBP, tối đa 1,5 MB.', en: 'A PNG, JPG or WEBP picture up to 1.5 MB.' } });
      return;
    }
    const result = file ? await uploadRoomAvatar(roomKey, file) : await removeRoomAvatar(roomKey);
    if (!result.ok) setNotice({ tone: 'danger', text: result.error });
    else onRoomAvatar?.();
  };

  const send = async (body: string, replyTo?: string) => {
    const result = await sendMessage(target, body, replyTo);
    setNotice(result.ok ? null : { tone: 'danger', text: result.error });
    return result.ok;
  };
  // Pictures are for direct messages only; the server enforces it too.
  const friendshipId = 'friendship_id' in target ? target.friendship_id : null;
  const sendPicture = friendshipId
    ? async (file: File, caption: string) => {
        const result = await sendImage(friendshipId, file, caption);
        setNotice(result.ok ? null : { tone: 'danger', text: result.error });
        return result.ok;
      }
    : undefined;
  const report = async (reason: string) => {
    const result = await reportConversation(target, reason);
    setNotice(result.ok
      ? { tone: 'info', text: { en: 'Thanks, we will take a look.', vi: 'Cảm ơn bạn, chúng tôi sẽ xem xét.' } }
      : { tone: 'danger', text: result.error });
  };
  const reportOne = async (messageId: string, reason: string) => {
    const result = await reportMessage(messageId, reason);
    setNotice(result.ok
      ? { tone: 'info', text: { en: 'Thanks, an admin will look at this message.', vi: 'Cảm ơn bạn, admin sẽ xem xét tin nhắn này.' } }
      : { tone: 'danger', text: result.error });
  };
  const addFriend = async (userId: string) => {
    const result = await sendRequest(userId);
    if (!result.ok) setNotice({ tone: 'danger', text: result.error });
  };
  const react = async (messageId: string, emoji: string) => {
    const result = await reactToMessage(messageId, emoji);
    if (!result.ok) return setNotice({ tone: 'danger', text: result.error });
    refreshReactions();
  };
  // Realtime brings the cleared row back to everyone, including this tab.
  const recall = async (messageId: string) => {
    const result = await recallMessage(messageId);
    setNotice(result.ok ? null : { tone: 'danger', text: result.error });
  };
  const block = async (userId: string) => {
    const result = await blockUser(userId);
    if (!result.ok) return setNotice({ tone: 'danger', text: result.error });
    setBlocked((prev) => [...prev, userId]);
    setNotice({ tone: 'info', text: { en: 'Blocked. You will not see their messages.', vi: 'Đã chặn. Bạn sẽ không thấy tin của họ.' } });
    onBlocked?.(userId);
  };

  return (
    <div ref={root} onPointerDown={markRead} onFocus={markRead} className="flex h-full min-h-0 flex-col">
      {(status === 'error' || notice) && (
        <div className="flex flex-col gap-2 px-4 pt-3 sm:px-6">
          {status === 'error' && <Alert tone="danger">{t({ en: 'Could not load messages.', vi: 'Không tải được tin nhắn.' })}</Alert>}
          {notice && <Alert tone={notice.tone}>{t(notice.text)}</Alert>}
        </div>
      )}
      <ChatPaneView
        messages={messages.filter((m) => !blocked.includes(m.sender_id))}
        meId={meId}
        onSend={send}
        onSendImage={sendPicture}
        onReport={(reason) => void report(reason)}
        onBlock={(id) => void block(id)}
        onReact={(id, emoji) => void react(id, emoji)}
        onRecall={(id) => void recall(id)}
        senders={senders}
        loading={status === 'loading'}
        hasOlder={hasOlder}
        loadingOlder={loadingOlder}
        onLoadOlder={loadOlder}
        reactions={reactions}
        title={title}
        subtitle={subtitle}
        peerId={peerId}
        roomAvatar={roomAvatar}
        onReportMessage={(id, reason) => void reportOne(id, reason)}
        friendships={friendships}
        onOpenDm={onOpenDm}
        onAddFriend={(id) => void addFriend(id)}
        onChangeRoomAvatar={isAdmin && roomKey ? (file) => void changeRoomAvatar(file) : undefined}
        onBack={onBack}
        backAlways={backAlways}
        showNames={!friendshipId}
      />
    </div>
  );
}
