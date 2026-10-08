'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { EducationLevel } from '@/features/landing/educationLevel';
import { GuestTutor } from '@/features/guest/GuestTutor';
import { TutorAvatar } from './TutorAvatar';
import { TutorChat } from './TutorChat';
import { lessonQuestions } from './examples';
import { useTutorSession } from './TutorSession';
import styles from './widget.module.css';

type Bilingual = { vi: string; en: string };
interface AiTutorPanelProps {
  id?: string;
  visible?: boolean;
  lessonId?: string;
  lessonTitle?: Bilingual;
  suggestions?: Bilingual[];
  guest?: ReactNode;
  level: EducationLevel;
  signedIn: boolean | null;
  onClose: () => void;
}
const CONTROL = 'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus';

/** A non-modal reading companion; visibility never owns the shared transcript. */
export function AiTutorPanel({ id, visible = true, lessonId, lessonTitle, suggestions, guest, level, signedIn, onClose }: AiTutorPanelProps) {
  const { t } = useLanguage();
  const session = useTutorSession();
  const panel = useRef<HTMLDivElement>(null);
  const [localConversationId, setConversationId] = useState<string | null>(null);
  const onConversation = useCallback((value: string) => setConversationId(value), []);
  const conversationId = session?.chat.conversationId ?? localConversationId;
  const fullPage = conversationId ? `/tutor?conversation=${conversationId}` : lessonId ? `/tutor?lesson=${lessonId}` : '/tutor';
  const questions = suggestions ?? (lessonTitle ? lessonQuestions(lessonTitle) : undefined);
  const expandLabel = t({ en: 'Open on the Professor page', vi: 'Mở ở trang Giáo sư Quý' });
  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => (panel.current?.querySelector<HTMLElement>('textarea') ?? panel.current?.querySelector<HTMLElement>('button'))?.focus());
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && event.target instanceof Node && panel.current?.contains(event.target)) { event.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', escape);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', escape); };
  }, [visible, onClose, signedIn]);

  return <div ref={panel} id={id} data-visible={visible || undefined} inert={!visible} aria-hidden={!visible} role="dialog" aria-label={t({ en: 'Professor Quys', vi: 'Giáo sư Quý' })} className={styles.panel}>
    <div className={styles.panelHeader}>
      <TutorAvatar size="2.5rem" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight text-ink">{t({ en: 'Professor Quys', vi: 'Giáo sư Quý' })}</p>
        <p className="truncate text-xs text-ink-muted">{session?.chat.streaming ? t({ en: 'Thinking…', vi: 'Thầy đang nghĩ…' }) : t({ en: 'Hints one step at a time', vi: 'Thầy gợi ý từng bước' })}</p>
        {lessonTitle && <p className="truncate text-xs font-semibold text-action">{t(lessonTitle)}</p>}
      </div>
      {signedIn && <Link href={fullPage} onClick={() => { if (session?.lesson) session.setPickedLesson(session.lesson); onClose(); }} aria-label={expandLabel} title={expandLabel} className={CONTROL}><ExternalLink aria-hidden="true" className="h-4 w-4" /></Link>}
      <button type="button" onClick={onClose} className={CONTROL} aria-label={t({ en: 'Minimise', vi: 'Thu nhỏ' })}><X aria-hidden="true" className="h-5 w-5" /></button>
    </div>
    <div className="min-h-0 flex-1">
      {signedIn === null ? <p role="status" className="p-5 text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p> : signedIn ? (
        <TutorChat active={visible} lessonId={lessonId} lessonTitle={lessonTitle ? t(lessonTitle) : undefined} level={level} compact suggestions={questions} onConversation={onConversation} />
      ) : guest || session ? <div className="h-full overflow-y-auto p-3">{guest ?? <GuestTutor suggestions={questions} />}</div> : (
        <div className="flex h-full flex-col items-start justify-center gap-3 p-6">
          <p className="text-lg font-bold text-ink">{t({ en: 'Sign in to ask the Professor', vi: 'Đăng nhập để hỏi thầy' })}</p>
          <p className="text-sm text-ink-muted">{t({ en: 'Your questions about this lesson are kept so you can come back to them.', vi: 'Câu hỏi của em về bài này được lưu lại để em xem tiếp sau.' })}</p>
          <Link href={`/login?redirect=${encodeURIComponent(fullPage)}`} className="inline-flex min-h-11 items-center rounded-xl bg-action px-4 text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">{t({ en: 'Sign in', vi: 'Đăng nhập' })}</Link>
        </div>
      )}
    </div>
  </div>;
}
