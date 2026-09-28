'use client';

import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import type { EducationLevel } from '@/features/landing/educationLevel';
import { AiTutorPanel } from './AiTutorPanel';

interface Props {
  lessonId: string;
  lessonTitle: { vi: string; en: string };
  level: EducationLevel;
}

export function AiTutorButton({ lessonId, lessonTitle, level }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (!open || signedIn !== null) return;
    void createBrowserClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
      .catch(() => setSignedIn(false));
  }, [open, signedIn]);

  return (
    <>
      <button
        type="button"
        disabled={!online}
        onClick={() => setOpen(true)}
        title={online ? t({ en: 'AI tutor', vi: 'Gia sư AI' }) : t({ en: 'Needs an internet connection', vi: 'Cần kết nối mạng' })}
        aria-label={t({ en: 'Open AI tutor', vi: 'Mở Gia sư AI' })}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-action text-action-ink shadow-[0_12px_28px_-12px_color-mix(in_srgb,var(--ink)_60%,transparent)] transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
      >
        <GraduationCap aria-hidden="true" className="h-6 w-6" />
      </button>
      {open && <AiTutorPanel lessonId={lessonId} lessonTitle={lessonTitle} level={level} signedIn={signedIn} onClose={() => setOpen(false)} />}
    </>
  );
}
