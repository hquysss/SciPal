'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { blockUser, reportMessage, sendMessage, type ChatMessage, type ChatTarget } from './chatApi';
import { useChatRoom } from './useChatRoom';

type Bilingual = { vi: string; en: string };
const BODY_MAX = 500;
// The Vietnamese text is what moderators read; the English is only for the reporter.
const REASONS: Bilingual[] = [
  { vi: 'Quấy rối', en: 'Harassment' },
  { vi: 'Spam', en: 'Spam' },
  { vi: 'Nội dung không phù hợp', en: 'Inappropriate content' },
  { vi: 'Khác', en: 'Other' },
];

export function ChatPaneView({ messages, meId, onSend, onReport, onBlock }: {
  messages: ChatMessage[];
  meId: string | null;
  /** Resolves true when the message went through, so the box can clear. */
  onSend: (body: string) => Promise<boolean>;
  onReport: (messageId: string, reason: string) => void;
  onBlock: (userId: string) => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const [reporting, setReporting] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<string | null>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
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
              <p className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-action text-action-ink' : 'bg-surface-sunken text-ink'}`}>{m.body}</p>
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

      <form onSubmit={(e) => void submit(e)} className="flex gap-2">
        <Input
          value={draft}
          maxLength={BODY_MAX}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={t({ en: 'Write a message', vi: 'Viết tin nhắn' })}
          placeholder={t({ en: 'Write a message', vi: 'Viết tin nhắn' })}
        />
        <Button type="submit" disabled={draft.trim() === ''}><Send aria-hidden="true" />{t({ en: 'Send', vi: 'Gửi' })}</Button>
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
        onReport={(id, reason) => void report(id, reason)}
        onBlock={(id) => void block(id)}
      />
    </div>
  );
}
