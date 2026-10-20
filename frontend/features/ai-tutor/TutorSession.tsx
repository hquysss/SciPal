'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@scipal/supabase';
import type { EducationLevel } from '@/features/landing/educationLevel';
import { useTutorChat } from './useTutorChat';

export type TutorLessonContext = {
  readonly id: string;
  readonly title: { vi: string; en: string };
  readonly level: EducationLevel;
};
type Session = {
  readonly chat: ReturnType<typeof useTutorChat>;
  readonly accountId: string | null;
  readonly isCurrentAccount: (id: string | null | undefined) => boolean;
  readonly signedIn: boolean | null;
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly draft: string;
  readonly setDraft: (draft: string) => void;
  readonly lesson: TutorLessonContext | null;
  readonly pickedLesson: TutorLessonContext | null;
  readonly setPickedLesson: (lesson: TutorLessonContext | null) => void;
  readonly registerLesson: (path: string, lesson: TutorLessonContext) => () => void;
};
const TutorSession = createContext<Session | null>(null);
export const useTutorSession = () => useContext(TutorSession);

/** Lives above route segments: navigation and panel visibility never own the request or transcript. */
export function TutorProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [pickedLesson, setPickedLesson] = useState<TutorLessonContext | null>(null);
  const [registered, setRegistered] = useState<{ path: string; lesson: TutorLessonContext } | null>(null);
  const lesson = registered?.path === pathname ? registered.lesson : pathname === '/tutor' ? pickedLesson : null;
  const chat = useTutorChat({ lessonId: lesson?.id });
  const userId = useRef<string | null | undefined>(undefined);
  const accountId = userId.current ?? null;
  const isCurrentAccount = useCallback((id: string | null | undefined) => userId.current === id, []);
  const { replace, refreshQuota } = chat;
  const registerLesson = useCallback((path: string, current: TutorLessonContext) => {
    setRegistered({ path, lesson: current });
    return () => setRegistered((old) => old?.lesson === current ? null : old);
  }, []);

  useEffect(() => {
    let active = true;
    let authVersion = 0;
    const auth = createBrowserClient().auth;
    const adopt = (id: string | null) => {
      if (!active) return;
      if (userId.current !== id) {
        replace([], null, true);
        setDraft('');
        setPickedLesson(null);
        userId.current = id;
      }
      setSignedIn(id !== null);
    };
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      authVersion += 1;
      adopt(session?.user.id ?? null);
    });
    const version = authVersion;
    void auth.getSession().then(({ data }) => {
      if (version === authVersion) adopt(data.session?.user.id ?? null);
    }).catch(() => { if (version === authVersion) adopt(null); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [replace, refreshQuota]);

  useEffect(() => {
    if (!signedIn) return;
    // Returning to the tab fires both focus and visibilitychange: one refresh per return, not two.
    let last = 0;
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 2000) return;
      last = Date.now();
      void refreshQuota();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [signedIn, refreshQuota]);

  useEffect(() => { if (signedIn) void refreshQuota(); }, [signedIn, accountId, open, pathname, refreshQuota]);

  return <TutorSession.Provider value={{ chat, accountId, isCurrentAccount, signedIn, open, setOpen, draft, setDraft, lesson, pickedLesson, setPickedLesson, registerLesson }}>{children}</TutorSession.Provider>;
}
