import { describe, expect, it } from 'vitest';
import { initialTutorState, tutorReducer, tutorRequest } from './useTutorChat';

describe('tutorReducer', () => {
  it('adds the question and an empty answer, then fills the answer from deltas', () => {
    let s = tutorReducer(initialTutorState([]), { type: 'send', text: 'Hỏi' });
    s = tutorReducer(s, { type: 'event', event: { event: 'meta', conversation_id: 'c1', remaining: 5 } });
    s = tutorReducer(s, { type: 'event', event: { event: 'delta', text: 'Gợi ' } });
    s = tutorReducer(s, { type: 'event', event: { event: 'delta', text: 'ý' } });
    s = tutorReducer(s, { type: 'event', event: { event: 'done' } });
    expect(s.messages).toEqual([{ role: 'user', content: 'Hỏi' }, { role: 'assistant', content: 'Gợi ý' }]);
    expect(s).toMatchObject({ conversationId: 'c1', remaining: 5, streaming: false, error: null });
  });

  it('drops an empty answer on error and marks the limit on 429', () => {
    let s = tutorReducer(initialTutorState([]), { type: 'send', text: 'Hỏi' });
    s = tutorReducer(s, { type: 'failed', status: 429, error: { vi: 'Hết lượt', en: 'Limit' }, remaining: 0 });
    expect(s.messages).toEqual([{ role: 'user', content: 'Hỏi' }]);
    expect(s).toMatchObject({ limitReached: true, remaining: 0, streaming: false, lastQuestion: 'Hỏi' });
  });
});

describe('retry', () => {
  it('adds only a new answer placeholder, not the question again', () => {
    let s = tutorReducer(initialTutorState([]), { type: 'send', text: 'Hỏi' });
    s = tutorReducer(s, { type: 'event', event: { event: 'meta', conversation_id: 'c1', remaining: 5 } });
    s = tutorReducer(s, { type: 'event', event: { event: 'error', error: { vi: 'Bận', en: 'Busy' } } });
    s = tutorReducer(s, { type: 'retry' });
    expect(s.messages).toEqual([{ role: 'user', content: 'Hỏi' }, { role: 'assistant', content: '' }]);
    expect(s).toMatchObject({ streaming: true, error: null });
  });

  it('asks the server to reuse the stored question only inside a conversation', () => {
    expect(tutorRequest({ conversationId: 'c1', lessonId: 'l1', text: 'Hỏi', language: 'vi', retry: true })).toEqual({ conversation_id: 'c1', message: 'Hỏi', language: 'vi', retry: true });
    expect(tutorRequest({ conversationId: null, lessonId: 'l1', text: 'Hỏi', language: 'en', retry: true })).toEqual({ lesson_id: 'l1', message: 'Hỏi', language: 'en' });
    expect(tutorRequest({ conversationId: null, lessonId: undefined, text: 'Hỏi', language: 'vi', retry: false })).toEqual({ message: 'Hỏi', language: 'vi' });
  });
});

