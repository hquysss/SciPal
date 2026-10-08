'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
import { useTutorSession } from './TutorSession';
import { lessonQuestions } from './examples';
import { levelOfGrade } from '@/features/landing/educationLevel';
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

/** The full page shares the root session with the floating panel. */
export function TutorPage({ level, lessons, initialConversationId, lessonId }: {
  level: EducationLevel; lessons: TutorLesson[]; initialConversationId?: string; lessonId?: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const session = useTutorSession();
  const [conversationList, setConversationList] = useState<{ owner: string | null; items: TutorConversation[] } | null>(null);
  const [notice, setNotice] = useState<Bilingual | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const mounted = useRef(true);
  const activeConversation = useRef(session?.chat.conversationId);
  const initialized = useRef<string | null>(null);
  const handledRoute = useRef<string | null>(null);
  const account = useRef(session?.accountId);
  useLayoutEffect(() => {
    account.current = session?.accountId;
    activeConversation.current = session?.chat.conversationId;
  }, [session?.accountId, session?.chat.conversationId]);
  const isCurrentAccount = session?.isCurrentAccount;
  const replace = session?.chat.replace;
  const setDraft = session?.setDraft;
  const setPickedLesson = session?.setPickedLesson;
  const selectedLesson = useCallback((id: string | null) => {
    const row = lessons.find((lesson) => lesson.id === id);
    return row ? { id: row.id, title: { vi: row.title_vi, en: row.title_en }, level: levelOfGrade(row.grade) } : null;
  }, [lessons]);
  const refreshList = useCallback(async () => {
    const owner = account.current;
    const res = await listConversations();
    if (!mounted.current || !isCurrentAccount?.(owner)) return;
    if (res.ok) setConversationList({ owner: owner ?? null, items: res.data.conversations });
    else setConversationList((old) => old?.owner === owner ? old : { owner: owner ?? null, items: [] });
  }, [isCurrentAccount]);
  const openConversation = useCallback(async (id: string) => {
    const version = ++request.current;
    const owner = account.current;
    setDrawer(false); setNotice(null); setLoading(true);
    try {
      const res = await getConversation(id);
      if (version !== request.current || !isCurrentAccount?.(owner)) return;
      if (!res.ok) { setNotice(res.error); return; }
      replace?.(res.data.messages, id); setDraft?.('');
      setPickedLesson?.(selectedLesson(res.data.conversation.lesson_id));
      router.replace('/tutor?conversation=' + id);
    } finally {
      if (mounted.current && version === request.current && isCurrentAccount?.(owner)) setLoading(false);
    }
  }, [replace, setDraft, setPickedLesson, selectedLesson, router, isCurrentAccount]);
  useEffect(() => {
    if (!session?.signedIn || !session.accountId) { initialized.current = null; handledRoute.current = null; return; }
    if (initialized.current !== session.accountId) {
      initialized.current = session.accountId;
      setNotice(null);
      void refreshList();
    }
    const target = [session.accountId, initialConversationId ?? '', lessonId ?? ''].join(':');
    if (handledRoute.current === target) return;
    handledRoute.current = target;
    request.current += 1;
    setLoading(false);
    if (initialConversationId && initialConversationId !== session.chat.conversationId) void openConversation(initialConversationId);
    else if (lessonId) setPickedLesson?.(selectedLesson(lessonId));
  }, [session?.signedIn, session?.accountId, initialConversationId, lessonId, openConversation, refreshList, selectedLesson, setPickedLesson, session?.chat.conversationId]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current += 1; }; }, []);
  const startNew = () => {
    request.current += 1; setLoading(false); setDrawer(false); setNotice(null);
    replace?.(); setDraft?.(''); setPickedLesson?.(null); router.replace('/tutor');
  };
  const remove = async (id: string) => {
    const owner = account.current;
    const res = await deleteConversation(id);
    if (!mounted.current || !isCurrentAccount?.(owner)) return;
    if (!res.ok) return setNotice(res.error);
    setConversationList((old) => old ? { ...old, items: old.items.filter((c) => c.id !== id) } : null);
    if (activeConversation.current === id) startNew();
  };
  const onConversation = useCallback((id: string) => { router.replace('/tutor?conversation=' + id); void refreshList(); }, [router, refreshList]);
  const conversations = conversationList && conversationList.owner === session?.accountId ? conversationList.items : null;
  const list = <ConversationList conversations={conversations} activeId={session?.chat.conversationId ?? null} onOpen={(id) => void openConversation(id)} onNew={startNew} onDelete={(id) => void remove(id)} />;
  const currentLesson = session?.lesson;
  return <div className="grid min-h-0 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-6">
    <TutorListFrame>{list}</TutorListFrame>
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button type="button" onClick={() => setDrawer(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-edge bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"><MessagesSquare aria-hidden="true" className="h-4 w-4 text-action" />{t({ en: 'Conversations', vi: 'Hội thoại' })}</button>
      </div>
      {notice && <Alert tone="danger">{t(notice)}</Alert>}
      <TutorChatFrame>
        {loading ? <p role="status" className="p-6 text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p> : <TutorChat
          conversationId={session?.chat.conversationId ?? undefined} level={currentLesson?.level ?? level} lessonId={currentLesson?.id}
          lessonTitle={currentLesson ? t(currentLesson.title) : undefined} suggestions={currentLesson ? lessonQuestions(currentLesson.title) : undefined}
          picker={session?.chat.messages.length === 0 ? <LessonPicker lessons={lessons} value={currentLesson?.id ?? null} onChange={(id) => setPickedLesson?.(selectedLesson(id))} /> : undefined}
          onConversation={onConversation} />}
      </TutorChatFrame>
    </div>
    <Dialog open={drawer} onClose={() => setDrawer(false)} title={t({ en: 'Conversations', vi: 'Hội thoại' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })} className="max-w-md">{list}</Dialog>
  </div>;
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
      aria-label={t({ en: 'Chat with the Professor Quys', vi: 'Trò chuyện với Giáo sư Quý' })}
      className="flex h-[calc(100dvh-13rem)] min-h-[28rem] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_24px_50px_-34px_color-mix(in_srgb,var(--ink)_55%,transparent)] lg:h-[calc(100dvh-11rem)]"
    >
      <div className={styles.bar}>
        <TutorAvatar />
        <div className="flex min-w-0 flex-col">
          <p className="font-bold leading-tight text-ink">{t({ en: 'Professor Quys', vi: 'Giáo sư Quý' })}</p>
          <span className={styles.online}>{t({ en: 'Hints step by step, never the whole answer', vi: 'Gợi ý từng bước, không giải hộ' })}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
