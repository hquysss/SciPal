'use client';

import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { TutorConversation } from './api';

/** The student's conversations, newest first, with "Hội thoại mới" on top. */
export function ConversationList({
  conversations,
  activeId,
  onOpen,
  onNew,
  onDelete,
}: {
  conversations: TutorConversation[] | null;
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const { lang, t } = useLanguage();
  const date = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', { day: 'numeric', month: 'short' });

  return (
    <nav aria-label={t({ en: 'Conversations', vi: 'Hội thoại' })} className="flex min-h-0 flex-col gap-3">
      <button
        type="button"
        onClick={onNew}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-edge bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <MessageSquarePlus aria-hidden="true" className="h-4 w-4 text-action" />
        {t({ en: 'New conversation', vi: 'Hội thoại mới' })}
      </button>

      {conversations === null ? (
        <p className="px-1 text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>
      ) : conversations.length === 0 ? (
        <p className="px-1 text-sm text-ink-muted">{t({ en: 'No conversations yet.', vi: 'Chưa có hội thoại nào.' })}</p>
      ) : (
        <ul className="-mx-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto px-1">
          {conversations.map((c) => {
            const active = c.id === activeId;
            return (
              <li key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 w-full flex-col items-start rounded-lg py-2 pl-3 pr-11 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${active ? 'bg-surface-sunken' : 'hover:bg-surface-sunken'}`}
                >
                  <span className={`line-clamp-2 text-sm leading-snug ${active ? 'font-semibold text-ink' : 'text-ink'}`}>{c.title}</span>
                  <span className="mt-0.5 text-xs text-ink-muted">{date.format(new Date(c.updated_at))}</span>
                </button>
                <button
                  type="button"
                  aria-label={t({ en: `Delete conversation ${c.title}`, vi: `Xóa hội thoại ${c.title}` })}
                  onClick={() => {
                    if (window.confirm(t({ en: 'Delete this conversation?', vi: 'Xóa hội thoại này?' }))) onDelete(c.id);
                  }}
                  className="absolute right-0.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted opacity-70 transition hover:bg-surface hover:text-danger hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus group-hover:opacity-100"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
