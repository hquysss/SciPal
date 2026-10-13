'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, CircleDashed, Mic, Square } from 'lucide-react';
import type { PracticeCheckResult } from '@scipal/types';
import { buttonVariants } from '@/components/ui/button';
import { getAccessToken } from '../../lib/session';
import { writingFeedback } from './practiceApi';

type Bilingual = { en: string; vi: string };

const MAX = 1000;

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** The browser's speech recognition (Chrome, Edge); null where there is none. */
type Recognition = {
  lang: string;
  interimResults?: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface WritingAnswerProps {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
  /** The server's check, once the learner pressed Check. */
  result: PracticeCheckResult | undefined;
  t: (text: Bilingual) => string;
  lang: 'vi' | 'en';
  /** The Check button and its message, shown between the answer and what the check found. */
  actions?: ReactNode;
}

/**
 * An English answer, written or spoken: a text box with a word count, a microphone where the
 * browser can listen, then the key terms the check found, the sample answer, and the AI
 * Professor's comments on request (signed-in learners, paid from the Professor's tokens).
 */
export function WritingAnswer({ questionId, value, onChange, result, t, lang, actions }: WritingAnswerProps) {
  const id = useId();
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<Bilingual | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<Bilingual | null>(null);

  // Decided after mounting: the server render has no browser to ask.
  useEffect(() => setCanListen(recognitionClass() !== null), []);
  useEffect(() => {
    let live = true;
    void getAccessToken().then((token) => live && setSignedIn(!!token));
    return () => {
      live = false;
      recognition.current?.stop();
    };
  }, []);
  // A new answer makes old comments stale.
  useEffect(() => {
    setFeedback(null);
    setFeedbackError(null);
  }, [value]);

  const listen = () => {
    const Ctor = recognitionClass();
    if (!Ctor) return;
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const heard = Array.from(e.results, (r) => r[0]?.transcript ?? '').join(' ').trim();
      if (heard) onChange(`${valueRef.current.trimEnd()} ${heard}`.trim().slice(0, MAX));
    };
    rec.onerror = (e) => {
      setMicError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? { en: 'The microphone is blocked. Allow it in the browser, or type your answer.', vi: 'Trình duyệt đang chặn micro. Cho phép micro hoặc gõ câu trả lời nhé.' }
          : { en: 'Could not hear you. Try again, or type your answer.', vi: 'Chưa nghe được. Thử nói lại hoặc gõ câu trả lời nhé.' },
      );
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognition.current = rec;
    setMicError(null);
    setListening(true);
    rec.start();
  };

  const ask = async () => {
    if (asking || !value.trim()) return;
    setAsking(true);
    setFeedbackError(null);
    const res = await writingFeedback(questionId, value, lang);
    setAsking(false);
    if (res.ok) setFeedback(res.data.feedback);
    else setFeedbackError(res.error);
  };

  const writing = result?.writing;
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-text`} className="text-sm font-semibold text-ink">
          {t({ en: 'Write your answer in English', vi: 'Viết câu trả lời bằng tiếng Anh' })}
        </label>
        <textarea
          id={`${id}-text`}
          lang="en"
          rows={3}
          maxLength={MAX}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">
          <span>{t({ en: `${wordCount(value)} words`, vi: `${wordCount(value)} từ` })}</span>
          {canListen && (
            <button
              type="button"
              onClick={listen}
              aria-label={listening ? t({ en: 'Stop listening', vi: 'Dừng nghe' }) : t({ en: 'Say your answer', vi: 'Nói câu trả lời' })}
              className={buttonVariants({ variant: 'outline' })}
            >
              {listening ? <Square aria-hidden="true" className="h-4 w-4" /> : <Mic aria-hidden="true" className="h-4 w-4" />}
              {listening ? t({ en: 'Stop', vi: 'Dừng' }) : t({ en: 'Speak', vi: 'Nói' })}
            </button>
          )}
        </div>
        {listening && <p className="text-sm font-semibold text-ink">{t({ en: 'Listening…', vi: 'Đang nghe…' })}</p>}
        {micError && (
          <p role="status" className="text-sm text-ink">
            {t(micError)}
          </p>
        )}
      </div>

      {actions}

      {writing && (
        <div className="flex flex-col gap-3 rounded-lg bg-surface-sunken p-3 text-sm">
          {writing.used.length + writing.missing.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {writing.used.length > 0 && (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink">
                  <span className="inline-flex items-center gap-1 font-semibold text-success">
                    <CircleCheck aria-hidden="true" className="h-4 w-4" />
                    {t({ en: 'Used', vi: 'Đã dùng' })}
                  </span>
                  <span lang="en">{writing.used.join(', ')}</span>
                </p>
              )}
              {writing.missing.length > 0 && (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink">
                  <span className="inline-flex items-center gap-1 font-semibold text-ink">
                    <CircleDashed aria-hidden="true" className="h-4 w-4" />
                    {t({ en: 'Missing', vi: 'Còn thiếu' })}
                  </span>
                  <span lang="en">{writing.missing.join(', ')}</span>
                </p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-ink">{t({ en: 'Sample answer', vi: 'Câu trả lời mẫu' })}</p>
            <p lang="en" className="text-ink">
              {writing.sample_answer}
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            {signedIn === false ? (
              <p className="text-ink-muted">{t({ en: "Sign in to get the Professor's comments.", vi: 'Đăng nhập để Giáo sư AI nhận xét bài viết.' })}</p>
            ) : signedIn ? (
              <button type="button" disabled={asking || !value.trim()} onClick={() => void ask()} className={`${buttonVariants({ variant: 'outline' })} self-start`}>
                {asking ? t({ en: 'The Professor is reading…', vi: 'Giáo sư đang đọc bài…' }) : t({ en: 'Ask the Professor to comment', vi: 'Nhờ Giáo sư nhận xét' })}
              </button>
            ) : null}
            <div aria-live="polite">
              {feedback && (
                <div className="rounded-lg border border-line bg-surface p-3">
                  <p className="mb-1 font-semibold text-ink">{t({ en: "The Professor's comments", vi: 'Giáo sư AI nhận xét' })}</p>
                  <p className="whitespace-pre-line text-ink">{feedback}</p>
                </div>
              )}
              {feedbackError && <p className="text-danger">{t(feedbackError)}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
