'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '@scipal/hooks';
import { AiTutorPanel } from './AiTutorPanel';

interface Props {
  lessonId: string;
  subjectSlug: string;
  token?: string | null;
}

export function AiTutorButton({ lessonId, subjectSlug, token = null }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);

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

  return (
    <>
      <button
        type="button"
        disabled={!online}
        onClick={() => setOpen(true)}
        title={online ? t({ en: 'AI tutor', vi: 'Gia sư AI' }) : t({ en: 'Needs an internet connection', vi: 'Cần kết nối mạng' })}
        aria-label={t({ en: 'Open AI tutor', vi: 'Mở Gia sư AI' })}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-action text-2xl text-action-ink shadow-lg transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
      >
        🤖
      </button>
      {open && (
        <AiTutorPanel
          lessonId={lessonId}
          subjectSlug={subjectSlug}
          token={token ?? null}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
