'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { blockUser, reportMessage, sendImage, sendMessage, type ChatMessage, type ChatTarget } from './chatApi';
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

export function ChatPaneView({ messages, meId, onSend, onSendImage, onReport, onBlock }: {
  messages: ChatMessage[];
  meId: string | null;
  /** Resolves true when the message went through, so the box can clear. */
  onSend: (body: string) => Promise<boolean>;
  /** Present only where pictures are allowed (direct messages). */
  onSendImage?: (file: File, caption: string) => Promise<boolean>;
  onReport: (messageId: string, reason: string) => void;
  onBlock: (userId: string) => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<Bilingual | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<string | null>(null);
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
    const body = draft.trim();
    if (file && onSendImage) {
      if (await onSendImage(file, body)) {
        setFile(null);
        setDraft('');
      }
      return;
    }
    if (!body) return;
    if (await onSend(body)) setDraft('');
  };

  return (
    <div className="flex h-[60dvh] min-h-80 flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div ref={log} role="log" aria-live="polite" aria-label={t({ en: 'Messages', vi: 'Tin nhắn' })} className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {messages.length === 0 && <p className="m-auto text-sm text-ink-muted">{t({ en: 'No messages yet. Say hello!', vi: 'Chưa có tin nhắn nào. Chào mọi người nhé!' })}</p>}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex max-w-[85%] flex-col gap-1 ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
              {!mine && <span className="text-xs font-semibold text-ink-muted">{m.sender_name}</span>}
              {isHttps(m.image_url) && (
                <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                  <img src={m.image_url} alt={t({ en: 'Picture', vi: 'Ảnh' })} loading="lazy" className="max-h-60 max-w-full object-cover" />
                </a>
              )}
              {m.body && <p className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-action text-action-ink' : 'bg-surface-sunken text-ink'}`}>{m.body}</p>}
              {!mine && (
                <span className="flex gap-1">
                  <Button type="button" variant="link" className="min-h-8 text-xs" onClick={() => setReporting(m.id)}>{t({ en: 'Report', vi: 'Báo cáo' })}</Button>
                  {confirmBlock === m.sender_id
                    ? <Button type="button" variant="link" className="min-h-8 text-xs text-danger" onClick={() => { setConfirmBlock(null); onBlock(m.sender_id); }}>{t({ en: 'Sure? Block', vi: 'Chắc chắn chặn?' })}</Button>
                    : <Button type="button" variant="link" className="min-h-8 text-xs" onClick={() => setConfirmBlock(m.sender_id)}>{t({ en: 'Block', vi: 'Chặn' })}</Button>}
                </span>
              )}
            </div>
          );
        })}
      </div>

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
          <label className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-edge bg-surface text-ink hover:bg-surface-sunken focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
            <ImagePlus aria-hidden="true" className="h-5 w-5" />
            <input type="file" accept={IMAGE_TYPES.join(',')} aria-label={t({ en: 'Attach a picture', vi: 'Đính kèm ảnh' })} onChange={choose} className="sr-only" />
          </label>
        )}
        <Input
          value={draft}
          maxLength={BODY_MAX}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={t({ en: 'Write a message', vi: 'Viết tin nhắn' })}
          placeholder={file ? t({ en: 'Add a caption (optional)', vi: 'Thêm chú thích (không bắt buộc)' }) : t({ en: 'Write a message', vi: 'Viết tin nhắn' })}
        />
        <SendButton label={t({ en: 'Send', vi: 'Gửi' })} disabled={draft.trim() === '' && !file} />
      </form>

      <Dialog open={reporting !== null} onClose={() => setReporting(null)} title={t({ en: 'Why are you reporting this?', vi: 'Vì sao bạn báo cáo tin này?' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })}>
        <div className="flex flex-col gap-2">
          {REASONS.map((reason) => (
            <Button key={reason.vi} type="button" variant="outline" onClick={() => { if (reporting) onReport(reporting, reason.vi); setReporting(null); }}>
              {t(reason)}
            </Button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

export function ChatPane({ target, onBlocked }: { target: ChatTarget; onBlocked?: (userId: string) => void }) {
  const { t } = useLanguage();
  const { messages, status } = useChatRoom(target);
  const [meId, setMeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'danger' | 'info'; text: Bilingual } | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    createBrowserClient().auth.getSession().then(({ data }) => setMeId(data.session?.user.id ?? null)).catch(() => undefined);
  }, []);

  const send = async (body: string) => {
    const result = await sendMessage(target, body);
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
  const report = async (messageId: string, reason: string) => {
    const result = await reportMessage(messageId, reason);
    setNotice(result.ok
      ? { tone: 'info', text: { en: 'Thanks, we will take a look.', vi: 'Cảm ơn bạn, chúng tôi sẽ xem xét.' } }
      : { tone: 'danger', text: result.error });
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
        onReport={(id, reason) => void report(id, reason)}
        onBlock={(id) => void block(id)}
      />
    </div>
  );
}
