'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MessagesSquare } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Dialog } from '@/components/ui/dialog';
import type { EducationLevel } from '@/features/landing/educationLevel';
import { deleteConversation, getConversation, listConversations, type TutorConversation, type TutorMessage } from './api';
import { ConversationList } from './ConversationList';
import { LessonPicker } from './LessonPicker';
import { TutorChat } from './TutorChat';
import { TutorAvatar } from './TutorAvatar';
import styles from './tutor.module.css';
import type { TutorLesson } from './tutorLessonTypes';

type Bilingual = { vi: string; en: string };
type Open = { key: string; id: string | null; messages: TutorMessage[]; lessonId: string | null };

/**
 * The lesson a chat is about: the one picked on a chat that started empty (it stays after the
 * first answer gives the chat an id), otherwise the stored lesson of the conversation opened.
 */
export function chatLessonId(open: Pick<Open, 'id' | 'messages' | 'lessonId'>, picked: string | null): string | null {
  return open.messages.length === 0 ? picked : open.lessonId;
}

const fresh = (lessonId: string | null = null): Open => ({ key: `new-${Date.now()}`, id: null, messages: [], lessonId });

/** The tutor page: conversations on the left (a drawer on phones), the chat on the right. */
export function TutorPage({
  level,
  lessons,
  initialConversationId,
  lessonId,
}: {
  level: EducationLevel;
  lessons: TutorLesson[];
  initialConversationId?: string;
  lessonId?: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [conversations, setConversations] = useState<TutorConversation[] | null>(null);
  const [open, setOpen] = useState<Open | null>(initialConversationId ? null : fresh(lessonId ?? null));
  const [notice, setNotice] = useState<Bilingual | null>(null);
  const [drawer, setDrawer] = useState(false);

  const refreshList = useCallback(async () => {
    const res = await listConversations();
    if (res.ok) setConversations(res.data.conversations);
    else setConversations((old) => old ?? []);
  }, []);

  const openConversation = useCallback(
    async (id: string) => {
      setDrawer(false);
      setNotice(null);
      const res = await getConversation(id);
      if (!res.ok) {
        setNotice(res.status === 404 ? { en: 'This conversation was not found.', vi: 'Không tìm thấy hội thoại này.' } : res.error);
        setOpen(fresh());
        router.replace('/tutor');
        return;
      }
      setOpen({ key: id, id, messages: res.data.messages, lessonId: res.data.conversation.lesson_id });
      router.replace(`/tutor?conversation=${id}`);
    },
    [router],
  );

  useEffect(() => {
    void refreshList();
    if (initialConversationId) void openConversation(initialConversationId);
    // Runs once for the page's first conversation; later ones open from the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    setDrawer(false);
    setNotice(null);
    setOpen(fresh());
    router.replace('/tutor');
  };

  const remove = async (id: string) => {
    const res = await deleteConversation(id);
    if (!res.ok) return setNotice(res.error);
    setConversations((old) => (old ?? []).filter((c) => c.id !== id));
    if (open?.id === id) startNew();
  };

  const onConversation = useCallback(
    (id: string) => {
      setOpen((old) => (old ? { ...old, id } : old));
      router.replace(`/tutor?conversation=${id}`);
      void refreshList();
    },
    [router, refreshList],
  );

  const lessonTitle = (id: string | null) => {
    const lesson = id ? lessons.find((l) => l.id === id) : undefined;
    return lesson ? t({ en: lesson.title_en, vi: lesson.title_vi }) : undefined;
  };

  const list = <ConversationList conversations={conversations} activeId={open?.id ?? null} onOpen={(id) => void openConversation(id)} onNew={startNew} onDelete={(id) => void remove(id)} />;

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-6">
      <TutorListFrame>{list}</TutorListFrame>

      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-edge bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <MessagesSquare aria-hidden="true" className="h-4 w-4 text-action" />
            {t({ en: 'Conversations', vi: 'Hội thoại' })}
          </button>
        </div>
        {notice && <Alert tone="danger">{t(notice)}</Alert>}

        <TutorChatFrame>
          {open ? (
            <OpenChat key={open.key} open={open} level={level} lessons={lessons} lessonTitle={lessonTitle} onConversation={onConversation} />
          ) : (
            <p className="p-6 text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>
          )}
        </TutorChatFrame>
      </div>

      <Dialog open={drawer} onClose={() => setDrawer(false)} title={t({ en: 'Conversations', vi: 'Hội thoại' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })} className="max-w-md">
        {list}
      </Dialog>
    </div>
  );
}

/** The conversations column (desktop only; phones open it as a drawer). */
export function TutorListFrame({ children }: { children: ReactNode }) {
  return (
    <aside className="hidden min-h-0 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface)_75%,transparent)] p-3 backdrop-blur-sm lg:flex lg:max-h-[calc(100dvh-11rem)] lg:flex-col">
      {children}
    </aside>
  );
}

/** The chat card: the tutor's name bar on top, the chat below. */
export function TutorChatFrame({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <section
      aria-label={t({ en: 'Chat with the tutor', vi: 'Trò chuyện với gia sư' })}
      className="flex h-[calc(100dvh-13rem)] min-h-[28rem] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_24px_50px_-34px_color-mix(in_srgb,var(--ink)_55%,transparent)] lg:h-[calc(100dvh-11rem)]"
    >
      <div className={styles.bar}>
        <TutorAvatar />
        <div className="flex min-w-0 flex-col">
          <p className="font-bold leading-tight text-ink">{t({ en: 'SciPal tutor', vi: 'Gia sư SciPal' })}</p>
          <span className={styles.online}>{t({ en: 'Hints step by step, never the whole answer', vi: 'Gợi ý từng bước, không giải hộ' })}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

/** One chat; a new, empty one offers the lesson picker until the first question is sent. */
function OpenChat({
  open,
  level,
  lessons,
  lessonTitle,
  onConversation,
}: {
  open: Open;
  level: EducationLevel;
  lessons: TutorLesson[];
  lessonTitle: (id: string | null) => string | undefined;
  onConversation: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(open.lessonId);
  const lessonId = chatLessonId(open, picked);
  return (
    <TutorChat
      conversationId={open.id ?? undefined}
      lessonId={lessonId ?? undefined}
      initialMessages={open.messages}
      level={level}
      lessonTitle={lessonTitle(lessonId)}
      picker={open.messages.length > 0 ? undefined : <LessonPicker lessons={lessons} value={picked} onChange={setPicked} />}
      onConversation={onConversation}
    />
  );
}
