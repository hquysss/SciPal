'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flag, ImagePlus, Reply, SmilePlus, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { REACTIONS, blockUser, reactToMessage, reportConversation, sendImage, sendMessage, type ChatMessage, type ChatTarget, type ReactionChip } from './chatApi';
import { groupMessages } from './chatLayout';
import { SendButton } from './SendButton';
import { useChatRoom } from './useChatRoom';

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

function Avatar({ name, className = 'h-8 w-8 text-sm' }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-surface-sunken font-bold text-ink ${className}`}>
      {name.trim().slice(0, 1).toUpperCase() || '?'}
    </span>
  );
}

export function ChatPaneView({ messages, meId, onSend, onSendImage, onReport, onBlock, onReact, reactions = {}, title, subtitle, onBack, showNames = true, now }: {
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
  title?: string;
  subtitle?: string;
  onBack?: () => void;
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
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages.length]);

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
  const snippet = (m: ChatMessage) => m.body || t({ en: 'Picture', vi: 'Ảnh' });

  return (
    <div className="flex h-[70dvh] min-h-96 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      {title && (
        <header className="flex items-center gap-3 border-b border-line px-3 py-2">
          {onBack && (
            <Button type="button" variant="ghost" size="icon" aria-label={t({ en: 'Back', vi: 'Quay lại' })} onClick={onBack}><ArrowLeft aria-hidden="true" /></Button>
          )}
          <Avatar name={title} className="h-10 w-10 text-base" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-ink">{title}</h2>
            {subtitle && <p className="truncate text-xs text-ink-muted">{subtitle}</p>}
          </div>
          <Button type="button" variant="ghost" className="shrink-0 text-danger" onClick={() => setReporting(true)}>
            <Flag aria-hidden="true" />{t({ en: 'Report', vi: 'Báo cáo' })}
          </Button>
        </header>
      )}

      <div ref={log} role="log" aria-live="polite" aria-label={t({ en: 'Messages', vi: 'Tin nhắn' })} className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && <p className="m-auto text-sm text-ink-muted">{t({ en: 'No messages yet. Say hello!', vi: 'Chưa có tin nhắn nào. Chào mọi người nhé!' })}</p>}
        {groups.map((group) => {
          const mine = group.sender_id === meId;
          const last = group.messages.length - 1;
          return (
            <div key={group.messages[0].id} className="flex flex-col gap-1">
              {group.timeLabel && <p className="my-1 text-center text-xs text-ink-muted">{group.timeLabel}</p>}
              <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                {!mine && <Link href={`/community/u/${group.sender_id}`} aria-label={group.sender_name} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"><Avatar name={group.sender_name} /></Link>}
                <div className={`flex min-w-0 max-w-[80%] flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && showNames && <Link href={`/community/u/${group.sender_id}`} className="px-1 text-xs font-semibold text-ink-muted hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">{group.sender_name}</Link>}
                  {group.messages.map((m, i) => {
                    const corners = mine
                      ? `${i > 0 ? 'rounded-tr-md' : ''} ${i < last ? 'rounded-br-md' : ''}`
                      : `${i > 0 ? 'rounded-tl-md' : ''} ${i < last ? 'rounded-bl-md' : ''}`;
                    return (
                      <div key={m.id} className={`group flex items-center gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex min-w-0 flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
                          {isHttps(m.image_url) && (
                            <button type="button" aria-label={t({ en: 'Enlarge picture', vi: 'Phóng to ảnh' })} onClick={() => setZoomed(m.image_url)} className={`block overflow-hidden rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${corners}`}>
                              <img src={m.image_url} alt={t({ en: 'Picture', vi: 'Ảnh' })} loading="lazy" className="max-h-60 max-w-full cursor-zoom-in object-cover" />
                            </button>
                          )}
                          {m.reply_to && (
                            <p className="max-w-full truncate rounded-lg border-l-2 border-line bg-surface-sunken px-2 py-1 text-xs text-ink-muted">
                              {byId.get(m.reply_to) ? `${byId.get(m.reply_to)!.sender_name}: ${snippet(byId.get(m.reply_to)!)}` : t({ en: 'Earlier message', vi: 'Tin trước đó' })}
                            </p>
                          )}
                          {m.body && (
                            <p className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${corners} ${mine ? 'bg-action text-action-ink' : 'bg-surface-sunken text-ink'}`}>{m.body}</p>
                          )}
                          {(reactions[m.id]?.length ?? 0) > 0 && (
                            <span className="flex flex-wrap gap-1">
                              {reactions[m.id].map((chip) => (
                                <button key={chip.emoji} type="button" aria-pressed={chip.mine} disabled={!onReact} onClick={() => onReact?.(m.id, chip.emoji)}
                                  className={`min-h-8 rounded-full border px-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${chip.mine ? 'border-action bg-surface-sunken font-bold' : 'border-line'}`}>
                                  {chip.emoji} {chip.count}
                                </button>
                              ))}
                            </span>
                          )}
                          {picking === m.id && onReact && (
                            <span role="group" aria-label={t({ en: 'Pick a reaction', vi: 'Chọn cảm xúc' })} className="flex gap-1 rounded-full border border-line bg-surface px-2 py-1">
                              {REACTIONS.map((emoji) => (
                                <button key={emoji} type="button" aria-label={emoji} onClick={() => { setPicking(null); onReact(m.id, emoji); }}
                                  className="min-h-8 min-w-8 rounded-full hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">{emoji}</button>
                              ))}
                            </span>
                          )}
                        </div>
                        <span className="flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={t({ en: 'Reply', vi: 'Trả lời' })} onClick={() => setReplyTo(m)}><Reply aria-hidden="true" /></Button>
                          {onReact && <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={t({ en: 'React', vi: 'Thả cảm xúc' })} onClick={() => setPicking(picking === m.id ? null : m.id)}><SmilePlus aria-hidden="true" /></Button>}
                        </span>
                        {!mine && (
                          <span className="flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                            {confirmBlock === m.sender_id
                              ? <Button type="button" variant="link" className="min-h-8 px-1 text-xs text-danger" onClick={() => { setConfirmBlock(null); onBlock(m.sender_id); }}>{t({ en: 'Sure? Block', vi: 'Chắc chắn chặn?' })}</Button>
                              : <Button type="button" variant="link" className="min-h-8 px-1 text-xs" onClick={() => setConfirmBlock(m.sender_id)}>{t({ en: 'Block', vi: 'Chặn' })}</Button>}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-3 py-3">
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
        <form onSubmit={(e) => void submit(e)} className="flex items-center gap-2">
          {onSendImage && (
            <label className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
              <ImagePlus aria-hidden="true" className="h-5 w-5" />
              <input type="file" accept={IMAGE_TYPES.join(',')} aria-label={t({ en: 'Attach a picture', vi: 'Đính kèm ảnh' })} onChange={choose} className="sr-only" />
            </label>
          )}
          <Input
            value={draft}
            maxLength={BODY_MAX}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={t({ en: 'Write a message', vi: 'Viết tin nhắn' })}
            placeholder={file ? t({ en: 'Add a caption (optional)', vi: 'Thêm chú thích (không bắt buộc)' }) : t({ en: 'Aa', vi: 'Aa' })}
            className="rounded-full bg-surface-sunken px-4"
          />
          <SendButton label={t({ en: 'Send', vi: 'Gửi' })} sendingLabel={t({ en: 'Sending…', vi: 'Đang gửi…' })} sending={sending} disabled={draft.trim() === '' && !file} />
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

export function ChatPane({ target, title, subtitle, onBack, onBlocked }: {
  target: ChatTarget;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onBlocked?: (userId: string) => void;
}) {
  const { t } = useLanguage();
  const [meId, setMeId] = useState<string | null>(null);
  const { messages, reactions, status, refreshReactions } = useChatRoom(target, meId);
  const [notice, setNotice] = useState<{ tone: 'danger' | 'info'; text: Bilingual } | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    createBrowserClient().auth.getSession().then(({ data }) => setMeId(data.session?.user.id ?? null)).catch(() => undefined);
  }, []);

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
  const react = async (messageId: string, emoji: string) => {
    const result = await reactToMessage(messageId, emoji);
    if (!result.ok) return setNotice({ tone: 'danger', text: result.error });
    refreshReactions();
  };
  const block = async (userId: string) => {
    const result = await blockUser(userId);
    if (!result.ok) return setNotice({ tone: 'danger', text: result.error });
    setBlocked((prev) => [...prev, userId]);
    setNotice({ tone: 'info', text: { en: 'Blocked. You will not see their messages.', vi: 'Đã chặn. Bạn sẽ không thấy tin của họ.' } });
    onBlocked?.(userId);
  };

  return (
    <div className="flex flex-col gap-3">
      {status === 'error' && <Alert tone="danger">{t({ en: 'Could not load messages.', vi: 'Không tải được tin nhắn.' })}</Alert>}
      {notice && <Alert tone={notice.tone}>{t(notice.text)}</Alert>}
      <ChatPaneView
        messages={messages.filter((m) => !blocked.includes(m.sender_id))}
        meId={meId}
        onSend={send}
        onSendImage={sendPicture}
        onReport={(reason) => void report(reason)}
        onBlock={(id) => void block(id)}
        onReact={(id, emoji) => void react(id, emoji)}
        reactions={reactions}
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        showNames={!friendshipId}
      />
    </div>
  );
}
