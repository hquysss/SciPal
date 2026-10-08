'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useLanguage } from '@scipal/hooks';
import { streamTutor, type TutorEvent } from './streamTutor';
import { getTutorQuota, type TutorMessage } from './api';

type Bilingual = { vi: string; en: string };
export type TutorState = {
  quotaStatus: 'loading' | 'ready' | 'error';
  conversationId: string | null;
  messages: TutorMessage[];
  streaming: boolean;
  remaining: number | null;
  /** What `remaining` counts: today's questions or this month's. */
  period: 'day' | 'month';
  error: Bilingual | null;
  limitReached: boolean;
  lastQuestion: string | null;
};
type Action =
  | { type: 'send'; text: string }
  | { type: 'retry' }
  | { type: 'event'; event: TutorEvent }
  | { type: 'failed'; status: number; error: Bilingual; remaining?: number; period?: 'day' | 'month' }
  | { type: 'finished' }
  | { type: 'quota'; remaining: number | null; period: 'day' | 'month' }
  | { type: 'quota-error' }
  | { type: 'replace'; messages: TutorMessage[]; conversationId: string | null; clearQuota: boolean };

export const initialTutorState = (messages: TutorMessage[], conversationId: string | null = null): TutorState => ({
  quotaStatus: 'loading', conversationId, messages, streaming: false, remaining: null, period: 'day', error: null, limitReached: false, lastQuestion: null,
});

/** Drops a trailing empty assistant message (an answer that never started). */
const trimEmpty = (messages: TutorMessage[]) => {
  const last = messages[messages.length - 1];
  return last?.role === 'assistant' && !last.content ? messages.slice(0, -1) : messages;
};

export function tutorReducer(state: TutorState, action: Action): TutorState {
  switch (action.type) {
    case 'quota':
      return { ...state, remaining: action.remaining, period: action.period, quotaStatus: 'ready', limitReached: action.remaining === 0 };
    case 'quota-error':
      return { ...state, quotaStatus: 'error' };
    case 'replace': {
      const fresh = initialTutorState(action.messages, action.conversationId);
      return action.clearQuota ? fresh : { ...fresh, remaining: state.remaining, period: state.period, quotaStatus: state.quotaStatus, limitReached: state.remaining === 0 };
    }
    case 'send':
      return { ...state, streaming: true, error: null, lastQuestion: action.text, messages: [...state.messages, { role: 'user', content: action.text }, { role: 'assistant', content: '' }] };
    case 'retry':
      // The question is already on screen (and stored): only a new answer is awaited.
      return { ...state, streaming: true, error: null, messages: [...trimEmpty(state.messages), { role: 'assistant', content: '' }] };
    case 'event': {
      const e = action.event;
      if (e.event === 'meta') return { ...state, quotaStatus: 'ready', conversationId: e.conversation_id, remaining: e.remaining, period: e.period, limitReached: e.remaining === 0 };
      if (e.event === 'delta') {
        const messages = [...state.messages];
        const last = messages[messages.length - 1];
        messages[messages.length - 1] = { ...last, content: last.content + e.text };
        return { ...state, messages };
      }
      if (e.event === 'error') {
        return {
          ...state,
          streaming: false,
          error: e.error,
          messages: trimEmpty(state.messages),
          remaining: e.remaining ?? state.remaining,
          limitReached: (e.remaining ?? state.remaining) === 0,
          conversationId: e.conversationRemoved ? null : state.conversationId,
        };
      }
      return { ...state, streaming: false };
    }
    case 'failed':
      return {
        ...state,
        streaming: false,
        error: action.error,
        messages: trimEmpty(state.messages),
        limitReached: action.status === 429,
        remaining: action.remaining ?? state.remaining,
        period: action.period ?? state.period,
        quotaStatus: action.remaining !== undefined ? 'ready' : state.quotaStatus,
      };
    case 'finished':
      return { ...state, streaming: false, messages: trimEmpty(state.messages) };
  }
}

/** The chat request body; `retry` reuses the stored question, so it only applies inside a conversation. */
export function tutorRequest(opts: { conversationId: string | null; lessonId: string | undefined; text: string; language: 'vi' | 'en'; retry: boolean }) {
  return {
    ...(opts.conversationId ? { conversation_id: opts.conversationId } : opts.lessonId ? { lesson_id: opts.lessonId } : {}),
    message: opts.text,
    language: opts.language,
    ...(opts.retry && opts.conversationId ? { retry: true } : {}),
  };
}

export function useTutorChat(opts: { conversationId?: string; lessonId?: string; initialMessages?: TutorMessage[] }) {
  const { lang } = useLanguage();
  const [state, dispatch] = useReducer(tutorReducer, initialTutorState(opts.initialMessages ?? [], opts.conversationId ?? null));
  const abort = useRef<AbortController | null>(null);
  const version = useRef(0);
  const quotaRequest = useRef(0);
  const conversation = useRef(state.conversationId);
  conversation.current = state.conversationId;

  const ask = useCallback(
    async (text: string, retry: boolean) => {
      const message = text.trim();
      if (!message || abort.current) return;
      const controller = new AbortController();
      abort.current = controller;
      version.current += 1;
      dispatch(retry ? { type: 'retry' } : { type: 'send', text: message });
      const res = await streamTutor(
        tutorRequest({ conversationId: conversation.current, lessonId: opts.lessonId, text: message, language: lang === 'en' ? 'en' : 'vi', retry }),
        (event) => { if (abort.current === controller) dispatch({ type: 'event', event }); },
        controller.signal,
      );
      if (abort.current !== controller) return;
      abort.current = null;
      if (!res.ok) dispatch({ type: 'failed', status: res.status, error: res.error, remaining: res.remaining, period: res.period });
      else dispatch({ type: 'finished' });
    },
    [lang, opts.lessonId],
  );
  const send = useCallback((text: string) => ask(text, false), [ask]);

  const stop = useCallback(() => {
    if (abort.current) { abort.current.abort(); version.current += 1; }
    abort.current = null;
    dispatch({ type: 'finished' });
  }, []);

  const retry = useCallback(async () => {
    if (state.lastQuestion) await ask(state.lastQuestion, true);
  }, [ask, state.lastQuestion]);

  const replace = useCallback((messages: TutorMessage[] = [], conversationId: string | null = null, clearQuota = false) => {
    stop();
    if (clearQuota) version.current += 1;
    conversation.current = conversationId;
    dispatch({ type: 'replace', messages, conversationId, clearQuota });
  }, [stop]);

  const refreshQuota = useCallback(async () => {
    if (abort.current) return;
    const currentVersion = version.current;
    const request = ++quotaRequest.current;
    const res = await getTutorQuota();
    if (currentVersion !== version.current || request !== quotaRequest.current) return;
    dispatch(res.ok ? { type: 'quota', ...res.data } : { type: 'quota-error' });
  }, []);

  useEffect(() => () => { abort.current?.abort(); abort.current = null; version.current += 1; }, []);
  return { ...state, send, stop, retry, replace, refreshQuota };
}
