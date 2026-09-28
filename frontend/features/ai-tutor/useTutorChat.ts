'use client';

import { useCallback, useReducer, useRef } from 'react';
import { useLanguage } from '@scipal/hooks';
import { streamTutor, type TutorEvent } from './streamTutor';
import type { TutorMessage } from './api';

type Bilingual = { vi: string; en: string };
export type TutorState = {
  conversationId: string | null;
  messages: TutorMessage[];
  streaming: boolean;
  remaining: number | null;
  error: Bilingual | null;
  limitReached: boolean;
  lastQuestion: string | null;
};
type Action =
  | { type: 'send'; text: string }
  | { type: 'event'; event: TutorEvent }
  | { type: 'failed'; status: number; error: Bilingual; remaining?: number }
  | { type: 'finished' };

export const initialTutorState = (messages: TutorMessage[], conversationId: string | null = null): TutorState => ({
  conversationId, messages, streaming: false, remaining: null, error: null, limitReached: false, lastQuestion: null,
});

/** Drops a trailing empty assistant message (an answer that never started). */
const trimEmpty = (messages: TutorMessage[]) => {
  const last = messages[messages.length - 1];
  return last?.role === 'assistant' && !last.content ? messages.slice(0, -1) : messages;
};

export function tutorReducer(state: TutorState, action: Action): TutorState {
  switch (action.type) {
    case 'send':
      return { ...state, streaming: true, error: null, lastQuestion: action.text, messages: [...state.messages, { role: 'user', content: action.text }, { role: 'assistant', content: '' }] };
    case 'event': {
      const e = action.event;
      if (e.event === 'meta') return { ...state, conversationId: e.conversation_id, remaining: e.remaining };
      if (e.event === 'delta') {
        const messages = [...state.messages];
        const last = messages[messages.length - 1];
        messages[messages.length - 1] = { ...last, content: last.content + e.text };
        return { ...state, messages };
      }
      if (e.event === 'error') return { ...state, streaming: false, error: e.error, messages: trimEmpty(state.messages) };
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
      };
    case 'finished':
      return { ...state, streaming: false, messages: trimEmpty(state.messages) };
  }
}

export function useTutorChat(opts: { conversationId?: string; lessonId?: string; initialMessages?: TutorMessage[] }) {
  const { lang } = useLanguage();
  const [state, dispatch] = useReducer(tutorReducer, initialTutorState(opts.initialMessages ?? [], opts.conversationId ?? null));
  const abort = useRef<AbortController | null>(null);
  const conversation = useRef(state.conversationId);
  conversation.current = state.conversationId;

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    dispatch({ type: 'send', text: message });
    const res = await streamTutor(
      { message, language: lang === 'en' ? 'en' : 'vi', ...(conversation.current ? { conversation_id: conversation.current } : opts.lessonId ? { lesson_id: opts.lessonId } : {}) },
      (event) => dispatch({ type: 'event', event }),
      controller.signal,
    );
    abort.current = null;
    if (!res.ok) dispatch({ type: 'failed', status: res.status, error: res.error, remaining: res.remaining });
    else dispatch({ type: 'finished' });
  }, [lang, opts.lessonId]);

  const stop = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
  }, []);

  const retry = useCallback(async () => {
    if (state.lastQuestion) await send(state.lastQuestion);
  }, [send, state.lastQuestion]);

  return { ...state, send, stop, retry };
}
