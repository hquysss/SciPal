'use client';
import { useState, useEffect } from 'react';
import { AiTutorPanel } from './AiTutorPanel';

interface Props {
  lessonId: string;
  subjectSlug: string;
  token?: string | null;
}

export function AiTutorButton({ lessonId, subjectSlug, token = null }: Props) {
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
        disabled={!online}
        onClick={() => setOpen(true)}
        title={online ? 'Gia sư AI' : 'Cần kết nối mạng'}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition duration-200"
        style={{ backgroundColor: 'var(--accent, #16a34a)' }}
        aria-label="Mở Gia sư AI"
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
