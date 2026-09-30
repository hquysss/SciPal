'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, ArrowUp, BookOpen, Lightbulb, Mic, Square } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mascot } from '@/components/mascot/Mascot';
import type { EducationLevel } from '@/features/landing/educationLevel';
import type { TutorMessage as Message } from './api';
import { EXAMPLE_QUESTIONS } from './examples';
import { TutorMessage } from './TutorMessage';
import { useTutorChat } from './useTutorChat';
import { TutorAvatar } from './TutorAvatar';
import styles from './tutor.module.css';
import { VoiceChat } from './voice/VoiceChat';

type Bilingual = { vi: string; en: string };

const MESSAGE_MAX = 2000;
const COUNTER_FROM = 1800;
// Suggestion chips take the level's decoration colours in turn (DESIGN.md: chips may use them).
const CHIP_TONES = ['var(--sun)', 'var(--sky)', 'var(--coral)'];

export interface TutorChatViewProps {
  messages: Message[];
  streaming: boolean;
  remaining: number | null;
  period?: 'day' | 'month';
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
  /** Opens a spoken session; without it there is no microphone button. */
  onVoice?: () => void;
}

/** The chat itself, without data fetching: messages, empty state, error and composer. */
export function TutorChatView({
  messages,
  streaming,
  remaining,
  period = 'day',
  error,
  limitReached,
  level,
  onSend,
  onStop,
  onRetry,
  lessonTitle,
  picker,
  compact = false,
  onVoice,
}: TutorChatViewProps) {
  const { t } = useLanguage();
  const ids = useId();
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const empty = messages.length === 0;
  const examples = EXAMPLE_QUESTIONS[level].slice(0, compact ? 2 : 4);
  const lastIndex = messages.length - 1;

  // Follow the newest message; an empty chat stays at the top so the greeting shows.
  useEffect(() => {
    const log = logRef.current;
    if (log && messages.length > 0) log.scrollTop = log.scrollHeight;
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
          <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-2 sm:pt-6">
            <div className={styles.hello}>
              <span className={styles.glow} aria-hidden="true" />
              {compact ? (
                <TutorAvatar size="3.25rem" />
              ) : (
                <Mascot directions="/mascots/owl-directions-324.webp" reactions="/mascots/owl-reactions-324.webp" size={112} label={t({ en: 'SciPal owl', vi: 'Cú SciPal' })} />
              )}
              <p className={styles.greeting}>
                {t({ en: 'Where are you ', vi: 'Em đang ' })}
                <span className={styles.greetingGlow}>{t({ en: 'stuck?', vi: 'bí ở đâu?' })}</span>
              </p>
              {!compact && (
                <p className="max-w-md text-base text-ink-muted">
                  {t({
                    en: 'Tell me what you have tried. I will give you one hint at a time so you work out the rest.',
                    vi: 'Kể thầy nghe em đã thử gì. Thầy gợi ý từng bước để em tự tìm ra phần còn lại.',
                  })}
                </p>
              )}
            </div>
            {picker}
            <ul className="grid gap-2.5 sm:grid-cols-2" aria-label={t({ en: 'Example questions', vi: 'Câu hỏi gợi ý' })}>
              {examples.map((example, i) => (
                <li key={example.vi}>
                  <button
                    type="button"
                    data-example
                    disabled={streaming || limitReached}
                    onClick={() => onSend(t(example))}
                    style={{ ['--chip' as string]: CHIP_TONES[i % CHIP_TONES.length] }}
                    className={styles.example}
                  >
                    <span className={styles.exampleIcon} aria-hidden="true">
                      <Lightbulb className="h-4 w-4" />
                    </span>
                    <span>{t(example)}</span>
                    <ArrowRight aria-hidden="true" className={`h-4 w-4 shrink-0 ${styles.exampleArrow}`} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((message, i) =>
              message.role === 'assistant' ? (
                <div key={message.id ?? i} className="flex items-start gap-3">
                  <TutorAvatar size="2.25rem" />
                  <div className="min-w-0 flex-1 pt-1">
                    <TutorMessage message={message} streaming={streaming && i === lastIndex} />
                  </div>
                </div>
              ) : (
                <TutorMessage key={message.id ?? i} message={message} />
              ),
            )}
          </div>
        )}
      </div>

      <div className="bg-[linear-gradient(to_top,var(--surface)_70%,transparent)] px-3 pb-3 pt-2 sm:px-6">
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
            className={styles.composer}
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
            {onVoice && !streaming && (
              <button
                type="button"
                onClick={onVoice}
                disabled={limitReached}
                aria-label={t({ en: 'Talk with the tutor', vi: 'Nói chuyện với thầy' })}
                title={t({ en: 'Talk with the tutor', vi: 'Nói chuyện với thầy' })}
                className={styles.voiceButton}
              >
                <Mic aria-hidden="true" className="h-5 w-5" />
              </button>
            )}
            {streaming ? (
              <Button type="button" variant="outline" onClick={onStop} className="shrink-0 rounded-full">
                <Square aria-hidden="true" className="h-4 w-4 fill-current" />
                {t({ en: 'Stop', vi: 'Dừng' })}
              </Button>
            ) : (
              <button type="submit" disabled={!draft.trim() || limitReached} aria-label={t({ en: 'Send', vi: 'Gửi' })} className={styles.send}>
                <ArrowUp aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
              </button>
            )}
          </form>
          <div className="flex min-h-5 items-center justify-between gap-3 px-1 text-xs text-ink-muted">
            <span>
              {remaining !== null && (
                <span className={styles.left}>
                  {period === 'month'
                    ? t({ en: `${remaining} questions left this month`, vi: `Còn ${remaining} lượt tháng này` })
                    : t({ en: `${remaining} questions left today`, vi: `Còn ${remaining} lượt hôm nay` })}
                </span>
              )}
            </span>
            {draft.length <= COUNTER_FROM && !compact && (
              <span className="hidden sm:inline">{t({ en: 'Enter to send · Shift+Enter for a new line', vi: 'Enter để gửi · Shift+Enter để xuống dòng' })}</span>
            )}
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
  const [talking, setTalking] = useState(false);
  const reported = useRef(conversationId ?? null);

  useEffect(() => {
    if (chat.conversationId && chat.conversationId !== reported.current && !chat.streaming) {
      reported.current = chat.conversationId;
      onConversation?.(chat.conversationId);
    }
  }, [chat.conversationId, chat.streaming, onConversation]);

  return (
    <>
    <TutorChatView
      messages={chat.messages}
      streaming={chat.streaming}
      remaining={chat.remaining}
      period={chat.period}
      error={chat.error}
      limitReached={chat.limitReached}
      level={level}
      onSend={(text) => void chat.send(text)}
      onStop={chat.stop}
      onRetry={() => void chat.retry()}
      lessonTitle={lessonTitle}
      picker={picker}
      compact={compact}
      onVoice={() => setTalking(true)}
    />
    {talking && <VoiceChat lessonId={lessonId} onClose={() => setTalking(false)} />}
    </>
  );
}
