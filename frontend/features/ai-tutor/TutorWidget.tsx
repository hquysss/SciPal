'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { LevelScope } from '@scipal/ui';
import { getShell } from '@/lib/theme/shellTheme';
import { parseEducationLevel, type EducationLevel } from '@/features/landing/educationLevel';
import { TutorAvatar } from './TutorAvatar';
import { LANDING_QUESTIONS, lessonQuestions } from './examples';
import { useTutorSession } from './TutorSession';
import styles from './widget.module.css';

const Panel = dynamic(() => import('./AiTutorPanel').then((module) => module.AiTutorPanel));

/** One affordance on every page, with the heavy chat UI loaded on first interaction. */
export function TutorWidget() {
  const session = useTutorSession();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [opened, setOpened] = useState(false);
  const [online, setOnline] = useState(true);
  const [level, setLevel] = useState<EducationLevel>('upper_secondary');
  const trigger = useRef<HTMLButtonElement>(null);
  const setOpen = session?.setOpen;
  const fullPage = pathname === '/tutor';
  useEffect(() => {
    const shell = getShell();
    const update = () => setLevel(parseEducationLevel(shell?.dataset.level) ?? 'upper_secondary');
    const connection = () => setOnline(navigator.onLine);
    update(); connection();
    const observer = new MutationObserver(update);
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['data-level'] });
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    return () => { observer.disconnect(); window.removeEventListener('online', connection); window.removeEventListener('offline', connection); };
  }, []);
  useEffect(() => { if (session?.open) setOpened(true); }, [session?.open]);
  useEffect(() => { if (fullPage) setOpen?.(false); }, [fullPage, setOpen]);
  const close = useCallback(() => { setOpen?.(false); requestAnimationFrame(() => trigger.current?.focus()); }, [setOpen]);
  if (!session) return null;
  const visible = session.open && !fullPage;
  const activeLevel = session.lesson?.level ?? level;
  const suggestions = session.lesson ? lessonQuestions(session.lesson.title) : LANDING_QUESTIONS[activeLevel];
  return <LevelScope level={activeLevel} className={styles.scope}>
    <button ref={trigger} type="button" disabled={!online} aria-haspopup="dialog" aria-expanded={visible} aria-controls={opened ? 'scipal-professor-panel' : undefined}
      aria-label={t({ en: 'Open Professor Quys', vi: 'Mở Giáo sư Quý' })}
      title={online ? t({ en: 'Ask the Professor', vi: 'Hỏi thầy' }) : t({ en: 'Needs an internet connection', vi: 'Cần kết nối mạng' })}
      className={styles.trigger} data-open={visible || undefined} data-answering={session.chat.streaming || undefined}
      onClick={() => {
        if (fullPage) { document.querySelector<HTMLTextAreaElement>('main textarea')?.focus(); return; }
        setOpened(true); session.setOpen(!session.open);
      }}>
      <TutorAvatar size="3.25rem" />
      <span aria-hidden="true" className={styles.indicator} />
      <span className={styles.hint}>{t({ en: 'Ask the Professor', vi: 'Hỏi thầy' })}</span>
    </button>
    {opened && <Panel id="scipal-professor-panel" visible={visible} lessonId={session.lesson?.id} lessonTitle={session.lesson?.title} level={activeLevel} signedIn={session.signedIn} suggestions={suggestions} onClose={close} />}
  </LevelScope>;
}
