'use client';

import { useGuestTutor, type GuestTutorState } from './useGuestTutor';
import { useTutorSession } from '@/features/ai-tutor/TutorSession';
export type { GuestTutorState } from './useGuestTutor';
import Link from 'next/link';
import { useId } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { TutorMessage } from '@/features/ai-tutor/TutorMessage';

// A visitor asks the tutor one question (backend routes/guest.ts counts it per visitor); after
// the answer, or if the question was already used, the next step is signing in.

const MESSAGE_MAX = 2000;
const LOGIN = `/login?mode=signup&redirect=${encodeURIComponent('/tutor')}`;

type Bilingual = { vi: string; en: string };
export function GuestTutorView({ state, question, onQuestion, onAsk, suggestions = [] }: { state: GuestTutorState; question: string; onQuestion: (value: string) => void; onAsk: () => void; suggestions?: Bilingual[] }) {
  const { t } = useLanguage();
  const questionId = useId();
  const headingId = questionId + '-heading';
  const signIn = (
    <Link href={LOGIN} className={buttonVariants({ className: 'self-start' })}>
      {t({ vi: 'Tạo tài khoản miễn phí để hỏi tiếp', en: 'Create a free account to keep asking' })}
    </Link>
  );

  return (
    <section aria-labelledby={headingId} className="flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-lg font-bold text-ink">{t({ vi: 'Hỏi thử 1 câu', en: 'Try one question' })}</h2>
        <p className="text-sm text-ink-muted">
          {t({ vi: 'Khách được hỏi Giáo sư SciPal 1 câu. Tạo tài khoản miễn phí (hoặc đăng nhập) để hỏi tiếp và lưu cuộc trò chuyện.', en: 'Visitors can ask the SciPal Professor one question. Create a free account (or sign in) to keep asking and keep the chat.' })}
        </p>
      </div>

      {(state.status === 'answered' || state.status === 'asking') && (
        <div className="flex flex-col gap-3">
          <TutorMessage message={{ role: 'user', content: state.question }} />
          {state.status === 'answered' ? (
            <TutorMessage message={{ role: 'assistant', content: state.answer }} />
          ) : (
            <p role="status" className="text-sm text-ink-muted">{t({ vi: 'Thầy đang nghĩ…', en: 'Thinking…' })}</p>
          )}
        </div>
      )}

      {state.status === 'answered' && signIn}

      {state.status === 'used' && (
        <>
          <Alert>{t(state.message)}</Alert>
          {signIn}
        </>
      )}

      {(state.status === 'idle' || state.status === 'error') && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onAsk();
          }}
        >
          {state.status === 'error' && <Alert tone="danger">{t(state.message)}</Alert>}
          {suggestions.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t({ vi: 'Câu hỏi gợi ý', en: 'Example questions' })}>
              {suggestions.map((s) => (
                <li key={s.vi}>
                  <button type="button" onClick={() => onQuestion(t(s))} className="rounded-full border border-line bg-surface-sunken px-3 py-1.5 text-left text-sm text-ink transition hover:border-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                    {t(s)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label htmlFor={questionId} className="text-sm font-semibold text-ink">{t({ vi: 'Câu hỏi của em', en: 'Your question' })}</label>
          <textarea
            id={questionId}
            value={question}
            onChange={(event) => onQuestion(event.target.value)}
            maxLength={MESSAGE_MAX}
            rows={3}
            placeholder={t({ vi: 'Vì sao tìm kiếm nhị phân cần dãy đã sắp xếp?', en: 'Why does binary search need a sorted list?' })}
            className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
          <button type="submit" disabled={!question.trim()} className={buttonVariants({ className: 'self-start' })}>
            {t({ vi: 'Hỏi Giáo sư SciPal', en: 'Ask the SciPal Professor' })}
          </button>
        </form>
      )}
    </section>
  );
}

export function GuestTutor({ suggestions }: { suggestions?: Bilingual[] } = {}) {
  const session = useTutorSession();
  return session ? <GuestTutorView state={session.guest.state} question={session.guest.question} onQuestion={session.guest.setQuestion} onAsk={() => void session.guest.ask()} suggestions={suggestions} /> : <LocalGuestTutor suggestions={suggestions} />;
}
function LocalGuestTutor({ suggestions }: { suggestions?: Bilingual[] }) {
  const guest = useGuestTutor();
  return <GuestTutorView state={guest.state} question={guest.question} onQuestion={guest.setQuestion} onAsk={() => void guest.ask()} suggestions={suggestions} />;
}
