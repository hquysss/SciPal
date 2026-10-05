'use client';

import { useCallback, useState } from 'react';
import { ExternalLink, GraduationCap, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { EducationLevel } from '@/features/landing/educationLevel';
import { TutorChat } from './TutorChat';

interface AiTutorPanelProps {
  lessonId: string;
  lessonTitle: { vi: string; en: string };
  level: EducationLevel;
  /** null while the session is being checked. */
  signedIn: boolean | null;
  onClose: () => void;
}

const LINK =
  'inline-flex items-center gap-1.5 text-sm font-semibold text-action underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** The tutor beside a lesson: questions carry the lesson, and the chat continues on /tutor. */
export function AiTutorPanel({ lessonId, lessonTitle, level, signedIn, onClose }: AiTutorPanelProps) {
  const { t } = useLanguage();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const onConversation = useCallback((id: string) => setConversationId(id), []);
  const fullPage = conversationId ? `/tutor?conversation=${conversationId}` : `/tutor?lesson=${lessonId}`;

  return (
    <div
      role="dialog"
      aria-label={t({ en: 'Professor Quys', vi: 'Giáo sư Quý' })}
      className="fixed inset-x-2 bottom-2 z-50 flex h-[min(34rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-24px_color-mix(in_srgb,var(--ink)_55%,transparent)] sm:inset-x-auto sm:right-4 sm:w-[26rem]"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-2">
        <GraduationCap aria-hidden="true" className="h-5 w-5 shrink-0 text-action" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{t({ en: 'Professor Quys', vi: 'Giáo sư Quý' })}</p>
          <p className="truncate text-xs text-ink-muted">{t(lessonTitle)}</p>
        </div>
        {signedIn && (
          <a href={fullPage} className={`${LINK} shrink-0 text-xs`}>
            {t({ en: 'Open on the Professor page', vi: 'Mở ở trang Giáo sư Quý' })}
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          aria-label={t({ en: 'Close', vi: 'Đóng' })}
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {signedIn === null ? (
          <p className="p-5 text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>
        ) : signedIn ? (
          <TutorChat lessonId={lessonId} level={level} compact onConversation={onConversation} />
        ) : (
          <div className="flex h-full flex-col items-start justify-center gap-3 p-6">
            <p className="text-lg font-bold text-ink">{t({ en: 'Sign in to ask the Professor', vi: 'Đăng nhập để hỏi thầy' })}</p>
            <p className="text-sm text-ink-muted">
              {t({ en: 'Your questions about this lesson are kept so you can come back to them.', vi: 'Câu hỏi của em về bài này được lưu lại để em xem tiếp sau.' })}
            </p>
            <a
              href={`/login?redirect=${encodeURIComponent(`/tutor?lesson=${lessonId}`)}`}
              className="inline-flex min-h-11 items-center rounded-xl bg-action px-4 text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {t({ en: 'Sign in', vi: 'Đăng nhập' })}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
