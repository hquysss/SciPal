'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { ArrowLeft, BookOpen, MessageSquare, Search } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TutorMessage } from '../ai-tutor/TutorMessage';
import { getAdminConversation, listAdminConversations, type AdminConversation, type AdminMessage } from './api';

// Admins read students' tutor conversations to check the tutor's quality. Read only.

type Bilingual = { vi: string; en: string };
type Filters = { q: string; from: string; to: string };

const FIELD = 'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';
const when = (iso: string) => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

/** `?q=…&from=…&to=…&before=…` from the filters that are set. */
export function chatListQuery(filters: Filters, before?: string): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (before) params.set('before', before);
  const s = params.toString();
  return s ? `?${s}` : '';
}

function StudentName({ name }: { name: string | null }) {
  const { t } = useLanguage();
  return <>{name ?? t({ en: 'Unnamed student', vi: 'Học sinh chưa đặt tên' })}</>;
}

export function ChatList({ conversations, onOpen }: { conversations: AdminConversation[]; onOpen: (c: AdminConversation) => void }) {
  const { t } = useLanguage();
  if (conversations.length === 0) {
    return <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-ink-muted">{t({ en: 'No conversations.', vi: 'Không có hội thoại nào.' })}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {conversations.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onOpen(c)}
            className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          >
            <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-sm font-semibold text-ink"><StudentName name={c.student.name} /></span>
              <span className="text-xs tabular-nums text-ink-muted">{when(c.updated_at)}</span>
            </span>
            <span className="line-clamp-2 break-words text-base text-ink">{c.title}</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
                {t({ en: `${c.messages} messages`, vi: `${c.messages} tin` })}
              </span>
              {c.lesson && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <BookOpen aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t({ en: `Lesson: ${c.lesson.title_en || c.lesson.title_vi}`, vi: `Bài: ${c.lesson.title_vi}` })}</span>
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ChatTranscript({
  conversation,
  messages,
  onBack,
}: {
  conversation: Pick<AdminConversation, 'title' | 'student' | 'lesson' | 'created_at'>;
  messages: AdminMessage[];
  onBack: () => void;
}) {
  const { t } = useLanguage();
  return (
    <section className="flex flex-col gap-4">
      <div>
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          {t({ en: 'All conversations', vi: 'Tất cả hội thoại' })}
        </Button>
      </div>
      <header className="flex flex-col gap-1">
        <h2 className="break-words text-xl font-bold text-ink">{conversation.title}</h2>
        <p className="text-sm text-ink-muted">
          <StudentName name={conversation.student.name} /> · {when(conversation.created_at)}
          {conversation.lesson ? ` · ${t({ en: `Lesson: ${conversation.lesson.title_en || conversation.lesson.title_vi}`, vi: `Bài: ${conversation.lesson.title_vi}` })}` : ''}
        </p>
      </header>
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        {messages.map((m, i) => (
          <TutorMessage key={m.id ?? i} message={{ role: m.role, content: m.content }} />
        ))}
      </div>
    </section>
  );
}

/** Tab "Hội thoại" of /admin/ai: filter, list, open one to read. */
export function AdminChats() {
  const { t } = useLanguage();
  const ids = useId();
  const [draft, setDraft] = useState<Filters>({ q: '', from: '', to: '' });
  const [filters, setFilters] = useState<Filters>(draft);
  const [list, setList] = useState<AdminConversation[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<{ conversation: AdminConversation; messages: AdminMessage[] | null } | null>(null);

  const load = useCallback(async (f: Filters, before?: string) => {
    const res = await listAdminConversations(chatListQuery(f, before));
    if (!res.ok) return setError(res.error);
    setError(null);
    setList((prev) => (before && prev ? [...prev, ...res.data.conversations] : res.data.conversations));
    setNext(res.data.next);
  }, []);

  useEffect(() => {
    setList(null);
    void load(filters);
  }, [filters, load]);

  const openConversation = async (c: AdminConversation) => {
    setOpen({ conversation: c, messages: null });
    const res = await getAdminConversation(c.id);
    if (!res.ok) {
      setOpen(null);
      return setError(res.error);
    }
    setOpen({ conversation: c, messages: res.data.messages });
  };

  if (open) {
    return open.messages ? (
      <ChatTranscript conversation={open.conversation} messages={open.messages} onBack={() => setOpen(null)} />
    ) : (
      <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        {t({ en: 'What students asked the Professor. Used only to check answer quality.', vi: 'Nội dung học sinh hỏi Giáo sư SciPal. Chỉ dùng để kiểm tra chất lượng.' })}
      </p>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...draft });
        }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-q`} className="text-sm font-semibold text-ink">{t({ en: 'Student name', vi: 'Tên học sinh' })}</label>
          <input id={`${ids}-q`} value={draft.q} maxLength={100} onChange={(e) => setDraft({ ...draft, q: e.target.value })} className={FIELD} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-from`} className="text-sm font-semibold text-ink">{t({ en: 'From', vi: 'Từ ngày' })}</label>
          <input id={`${ids}-from`} type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className={FIELD} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-to`} className="text-sm font-semibold text-ink">{t({ en: 'To', vi: 'Đến ngày' })}</label>
          <input id={`${ids}-to`} type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className={FIELD} />
        </div>
        <Button type="submit">
          <Search aria-hidden="true" />
          {t({ en: 'Filter', vi: 'Lọc' })}
        </Button>
      </form>

      {error && <Alert tone="danger">{t(error)}</Alert>}
      {list === null ? (
        !error && <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>
      ) : (
        <>
          <ChatList conversations={list} onOpen={(c) => void openConversation(c)} />
          {next && (
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={loadingMore}
                onClick={async () => {
                  setLoadingMore(true);
                  await load(filters, next);
                  setLoadingMore(false);
                }}
              >
                {loadingMore ? t({ en: 'Loading…', vi: 'Đang tải…' }) : t({ en: 'Show more', vi: 'Xem thêm' })}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
