'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, BookOpen, Square } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { EducationLevel } from '@/features/landing/educationLevel';
import type { TutorMessage as Message } from './api';
import { EXAMPLE_QUESTIONS } from './examples';
import { TutorMessage } from './TutorMessage';
import { useTutorChat } from './useTutorChat';

type Bilingual = { vi: string; en: string };

const MESSAGE_MAX = 2000;
const COUNTER_FROM = 1800;
// Suggestion chips take the level's decoration colours in turn (DESIGN.md: chips may use them).
const CHIP_TONES = ['var(--sun)', 'var(--sky)', 'var(--coral)'];

export interface TutorChatViewProps {
  messages: Message[];
  streaming: boolean;
  remaining: number | null;
  error: Bilingual | null;
  limitReached: boolean;
  level: EducationLevel;
  onSend: (text: string) => void;
  onStop: () => void;
  onRetry: () => void;
  /** Title of the lesson the conversation is about, shown as a chip above the messages. */
  lessonTitle?: string;
  /** Shown on an empty chat above the examples (the lesson picker on the tutor page). */
  picker?: ReactNode;
  /** The lesson panel: shorter greeting, two examples. */
  compact?: boolean;
}

/** The chat itself, without data fetching: messages, empty state, error and composer. */
export function TutorChatView({
  messages,
  streaming,
  remaining,
  error,
  limitReached,
  level,
  onSend,
  onStop,
  onRetry,
  lessonTitle,
  picker,
  compact = false,
}: TutorChatViewProps) {
  const { t } = useLanguage();
  const ids = useId();
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const empty = messages.length === 0;
  const examples = EXAMPLE_QUESTIONS[level].slice(0, compact ? 2 : 4);
  const lastIndex = messages.length - 1;

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages]);

  const submit = () => {
    const text = draft.trim();
    if (!text || streaming || limitReached) return;
    onSend(text);
    setDraft('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={logRef} role="log" aria-live="polite" aria-busy={streaming} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        {lessonTitle && (
          <p className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-muted">
            <BookOpen aria-hidden="true" className="h-4 w-4 shrink-0 text-action" />
            <span className="truncate">
              {t({ en: 'Asking about: ', vi: 'Đang hỏi về: ' })}
              <span className="font-semibold text-ink">{lessonTitle}</span>
            </span>
          </p>
        )}

        {empty ? (
          <div className="mx-auto flex max-w-xl flex-col gap-5 pt-2 sm:pt-6">
            <div className="flex flex-col gap-1.5">
              <p className="text-balance text-2xl font-bold tracking-tight text-ink">{t({ en: 'Where are you stuck?', vi: 'Em đang bí ở đâu?' })}</p>
              {!compact && (
                <p className="text-base text-ink-muted">
                  {t({
                    en: 'Tell me what you have tried. I will give you one hint at a time so you work out the rest.',
                    vi: 'Kể thầy nghe em đã thử gì. Thầy gợi ý từng bước để em tự tìm ra phần còn lại.',
                  })}
                </p>
              )}
            </div>
            {picker}
            <ul className="grid gap-2 sm:grid-cols-2" aria-label={t({ en: 'Example questions', vi: 'Câu hỏi gợi ý' })}>
              {examples.map((example, i) => (
                <li key={example.vi}>
                  <button
                    type="button"
                    data-example
                    disabled={streaming || limitReached}
                    onClick={() => onSend(t(example))}
                    style={{ ['--chip' as string]: CHIP_TONES[i % CHIP_TONES.length] }}
                    className="h-full w-full rounded-xl border border-line bg-[color-mix(in_srgb,var(--chip)_16%,var(--surface))] px-4 py-3 text-left text-sm leading-snug text-ink transition-colors hover:border-edge hover:bg-[color-mix(in_srgb,var(--chip)_30%,var(--surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                  >
                    {t(example)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((message, i) => (
              <TutorMessage key={message.id ?? i} message={message} streaming={streaming && i === lastIndex && message.role === 'assistant'} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line bg-surface px-3 pb-3 pt-2 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {error && (
            <Alert tone="danger">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{t(error)}</span>
                {!limitReached && (
                  <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                    {t({ en: 'Try again', vi: 'Thử lại' })}
                  </button>
                )}
              </span>
            </Alert>
          )}
          <form
            className="flex items-end gap-2 rounded-2xl border border-edge bg-paper p-2 focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor={`${ids}-q`} className="sr-only">
              {t({ en: 'Your question', vi: 'Câu hỏi của em' })}
            </label>
            <textarea
              id={`${ids}-q`}
              rows={compact ? 1 : 2}
              maxLength={MESSAGE_MAX}
              disabled={limitReached}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={limitReached ? t({ en: 'No questions left today', vi: 'Hôm nay em đã hết lượt hỏi' }) : t({ en: 'Ask the tutor…', vi: 'Hỏi thầy…' })}
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-base leading-6 text-ink caret-action outline-none placeholder:text-ink-muted disabled:cursor-not-allowed"
            />
            {streaming ? (
              <Button type="button" variant="outline" onClick={onStop} className="shrink-0">
                <Square aria-hidden="true" className="h-4 w-4 fill-current" />
                {t({ en: 'Stop', vi: 'Dừng' })}
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!draft.trim() || limitReached} aria-label={t({ en: 'Send', vi: 'Gửi' })} className="shrink-0 rounded-xl">
                <ArrowUp aria-hidden="true" className="h-5 w-5" />
              </Button>
            )}
          </form>
          <div className="flex min-h-5 items-center justify-between gap-3 px-1 text-xs text-ink-muted">
            <span>
              {remaining !== null && t({ en: `${remaining} questions left today`, vi: `Còn ${remaining} lượt hôm nay` })}
            </span>
            {draft.length > COUNTER_FROM && (
              <span className="tabular-nums" aria-live="polite">
                {draft.length}/{MESSAGE_MAX}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The chat wired to the tutor API. */
export function TutorChat({
  conversationId,
  lessonId,
  initialMessages,
  level,
  lessonTitle,
  picker,
  compact,
  onConversation,
}: {
  conversationId?: string;
  lessonId?: string;
  initialMessages?: Message[];
  level: EducationLevel;
  lessonTitle?: string;
  picker?: ReactNode;
  compact?: boolean;
  onConversation?: (id: string) => void;
}) {
  const chat = useTutorChat({ conversationId, lessonId, initialMessages });
  const reported = useRef(conversationId ?? null);

  useEffect(() => {
    if (chat.conversationId && chat.conversationId !== reported.current && !chat.streaming) {
      reported.current = chat.conversationId;
      onConversation?.(chat.conversationId);
    }
  }, [chat.conversationId, chat.streaming, onConversation]);

  return (
    <TutorChatView
      messages={chat.messages}
      streaming={chat.streaming}
      remaining={chat.remaining}
      error={chat.error}
      limitReached={chat.limitReached}
      level={level}
      onSend={(text) => void chat.send(text)}
      onStop={chat.stop}
      onRetry={() => void chat.retry()}
      lessonTitle={lessonTitle}
      picker={picker}
      compact={compact}
    />
  );
}
