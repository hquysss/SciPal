'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { TutorMessage } from '@/features/ai-tutor/TutorMessage';

// A visitor asks the tutor one question (backend routes/guest.ts counts it per visitor); after
// the answer, or if the question was already used, the next step is signing in.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
const MESSAGE_MAX = 2000;
const LOGIN = `/login?mode=signup&redirect=${encodeURIComponent('/tutor')}`;

type Bilingual = { vi: string; en: string };
export type GuestTutorState =
  | { status: 'idle' }
  | { status: 'asking'; question: string }
  | { status: 'answered'; question: string; answer: string }
  | { status: 'used'; message: Bilingual }
  | { status: 'error'; message: Bilingual };

export function GuestTutorView({ state, question, onQuestion, onAsk }: { state: GuestTutorState; question: string; onQuestion: (value: string) => void; onAsk: () => void }) {
  const { t } = useLanguage();
  const signIn = (
    <Link href={LOGIN} className={buttonVariants({ className: 'self-start' })}>
      {t({ vi: 'Tạo tài khoản miễn phí để hỏi tiếp', en: 'Create a free account to keep asking' })}
    </Link>
  );

  return (
    <section aria-labelledby="guest-tutor-title" className="flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="guest-tutor-title" className="text-lg font-bold text-ink">{t({ vi: 'Hỏi thử 1 câu', en: 'Try one question' })}</h2>
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
          <label htmlFor="guest-tutor-question" className="text-sm font-semibold text-ink">{t({ vi: 'Câu hỏi của em', en: 'Your question' })}</label>
          <textarea
            id="guest-tutor-question"
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

export function GuestTutor() {
  const { lang } = useLanguage();
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<GuestTutorState>({ status: 'idle' });

  const ask = async () => {
    const text = question.trim();
    if (!text) return;
    setState({ status: 'asking', question: text });
    try {
      const res = await fetch(`${API_BASE}/api/tutor/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language: lang }),
      });
      const body = (await res.json().catch(() => ({}))) as { answer?: string; code?: string; error?: string; error_en?: string };
      const message = { vi: body.error ?? 'Giáo sư SciPal chưa trả lời được. Em thử lại nhé.', en: body.error_en ?? 'The Professor could not answer. Try again.' };
      if (res.ok && body.answer) setState({ status: 'answered', question: text, answer: body.answer });
      else if (res.status === 429) setState({ status: 'used', message });
      else setState({ status: 'error', message });
    } catch {
      setState({ status: 'error', message: { vi: 'Không kết nối được máy chủ. Em thử lại nhé.', en: 'Could not reach the server. Try again.' } });
    }
  };

  return <GuestTutorView state={state} question={question} onQuestion={setQuestion} onAsk={() => void ask()} />;
}
