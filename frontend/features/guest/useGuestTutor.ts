'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { z } from 'zod';

type Bilingual = { vi: string; en: string };
export type GuestTutorState =
  | { status: 'idle' }
  | { status: 'asking'; question: string }
  | { status: 'answered'; question: string; answer: string }
  | { status: 'used'; message: Bilingual }
  | { status: 'error'; message: Bilingual };
const Reply = z.object({ answer: z.string().optional(), error: z.string().optional(), error_en: z.string().optional() });
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

export function useGuestTutor() {
  const { lang } = useLanguage();
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<GuestTutorState>({ status: 'idle' });
  const abort = useRef<AbortController | null>(null);
  const reset = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setQuestion('');
    setState({ status: 'idle' });
  }, []);
  useEffect(() => () => { abort.current?.abort(); abort.current = null; }, []);

  const ask = async () => {
    const text = question.trim();
    if (!text || abort.current || state.status === 'answered' || state.status === 'used') return;
    const controller = new AbortController();
    abort.current = controller;
    setState({ status: 'asking', question: text });
    try {
      const res = await fetch(`${API_BASE}/api/tutor/guest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language: lang }), signal: controller.signal,
      });
      const parsed = Reply.safeParse(await res.json());
      if (abort.current !== controller) return;
      const body = parsed.success ? parsed.data : {};
      const message = { vi: body.error ?? 'Thầy chưa trả lời được. Em thử lại nhé.', en: body.error_en ?? 'The Professor could not answer. Try again.' };
      if (res.ok && body.answer) setState({ status: 'answered', question: text, answer: body.answer });
      else if (res.status === 429) setState({ status: 'used', message });
      else setState({ status: 'error', message });
    } catch (error) {
      if (abort.current !== controller || (error instanceof Error && error.name === 'AbortError')) return;
      setState({ status: 'error', message: { vi: 'Không kết nối được máy chủ. Em thử lại nhé.', en: 'Could not reach the server. Try again.' } });
    } finally {
      if (abort.current === controller) abort.current = null;
    }
  };
  return { state, question, setQuestion, ask, reset };
}
