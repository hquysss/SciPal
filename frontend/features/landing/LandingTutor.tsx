'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { AiTutorPanel } from '@/features/ai-tutor/AiTutorPanel';
import { LANDING_QUESTIONS } from '@/features/ai-tutor/examples';
import { TutorAvatarOnline } from '@/features/ai-tutor/TutorAvatar';
import { GuestTutor } from '@/features/guest/GuestTutor';
import type { EducationLevel } from './educationLevel';

/**
 * A floating Professor on the landing page, the same panel as beside a lesson. Signed in, it is the
 * real tutor chat; a visitor gets the one-question trial (as on /tutor), then is sent to sign up.
 */
export function LandingTutor({ level, signedIn, hidden = false }: { level: EducationLevel; signedIn: boolean; hidden?: boolean }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (hidden) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          disabled={!online}
          onClick={() => setOpen(true)}
          title={online ? t({ en: 'Professor Quys', vi: 'Giáo sư Quý' }) : t({ en: 'Needs an internet connection', vi: 'Cần kết nối mạng' })}
          aria-label={t({ en: 'Ask Professor Quys', vi: 'Hỏi Giáo sư Quý' })}
          className="group fixed bottom-5 right-5 z-40 flex rounded-full bg-surface p-1 ring-2 ring-[color-mix(in_srgb,var(--action)_45%,transparent)] transition duration-200 hover:-translate-y-0.5 hover:scale-105 hover:ring-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none motion-reduce:hover:transform-none shadow-[0_12px_28px_-12px_color-mix(in_srgb,var(--ink)_60%,transparent)]"
        >
          <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-[color-mix(in_srgb,var(--action)_35%,transparent)] blur-md motion-safe:animate-pulse" />
          <TutorAvatarOnline size="3.5rem" />
        </button>
      )}
      {open && (
        <AiTutorPanel
          level={level}
          signedIn={signedIn}
          suggestions={LANDING_QUESTIONS[level]}
          guest={<GuestTutor suggestions={LANDING_QUESTIONS[level]} />}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
