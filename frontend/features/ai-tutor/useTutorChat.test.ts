import { describe, expect, it } from 'vitest';
import { initialTutorState, tutorReducer, tutorRequest } from './useTutorChat';

describe('tutorReducer', () => {
  it('takes the tokens left after an answer from done, and blocks the box at zero', () => {
    let s = tutorReducer(initialTutorState([]), { type: 'send', text: 'Hỏi' });
    s = tutorReducer(s, { type: 'event', event: { event: 'meta', conversation_id: 'c1', remaining: 30000, period: 'day' } });
    s = tutorReducer(s, { type: 'event', event: { event: 'done', remaining: 28500, period: 'day' } });
    expect(s).toMatchObject({ remaining: 28500, period: 'day', streaming: false, limitReached: false });
    s = tutorReducer(s, { type: 'send', text: 'Tiếp' });
    s = tutorReducer(s, { type: 'event', event: { event: 'done', remaining: 0, period: 'month' } });
    expect(s).toMatchObject({ remaining: 0, period: 'month', limitReached: true });
    // An older server sends no count: what the student already sees stays.
    s = tutorReducer(s, { type: 'event', event: { event: 'done' } });
    expect(s).toMatchObject({ remaining: 0, limitReached: true });
  });

  it('adds the question and an empty answer, then fills the answer from deltas', () => {
    let s = tutorReducer(initialTutorState([]), { type: 'send', text: 'Hỏi' });
    s = tutorReducer(s, { type: 'event', event: { event: 'meta', conversation_id: 'c1', remaining: 5, period: 'month' } });
    s = tutorReducer(s, { type: 'event', event: { event: 'delta', text: 'Gợi ' } });
    s = tutorReducer(s, { type: 'event', event: { event: 'delta', text: 'ý' } });
    s = tutorReducer(s, { type: 'event', event: { event: 'done' } });
    expect(s.messages).toEqual([{ role: 'user', content: 'Hỏi' }, { role: 'assistant', content: 'Gợi ý' }]);
    expect(s).toMatchObject({ conversationId: 'c1', remaining: 5, period: 'month', streaming: false, error: null });
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
    s = tutorReducer(s, { type: 'event', event: { event: 'meta', conversation_id: 'c1', remaining: 5, period: 'day' } });
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

describe('a failed answer', () => {
  it('shows the refunded count and forgets a conversation the server removed', () => {
    let s = tutorReducer(initialTutorState([]), { type: 'send', text: 'Hỏi' });
    s = tutorReducer(s, { type: 'event', event: { event: 'meta', conversation_id: 'c1', remaining: 26, period: 'day' } });
    s = tutorReducer(s, { type: 'event', event: { event: 'error', error: { vi: 'Quá tải', en: 'Overloaded' }, remaining: 27, conversationRemoved: true } });
    expect(s).toMatchObject({ remaining: 27, conversationId: null, streaming: false });
    expect(s.messages).toEqual([{ role: 'user', content: 'Hỏi' }]);
  });
});


describe('shared quota state', () => {
  it('disables questions at zero and restores the refunded request after an error', () => {
    let state = tutorReducer(initialTutorState([]), { type: 'send', text: 'Hỏi' });
    state = tutorReducer(state, { type: 'event', event: { event: 'meta', conversation_id: 'c1', remaining: 0, period: 'month' } });
    expect(state.limitReached).toBe(true);
    state = tutorReducer(state, { type: 'event', event: { event: 'error', error: { vi: 'Bận', en: 'Busy' }, remaining: 1 } });
    expect(state.limitReached).toBe(false);
    expect(state.remaining).toBe(1);
  });
});

it('keeps the monthly quota period when the server refuses the first question', () => {
  const state = tutorReducer(initialTutorState([]), { type: 'failed', status: 429, remaining: 0, period: 'month', error: { vi: 'Hết lượt tháng này', en: 'Monthly limit' } });
  expect(state.period).toBe('month');
});

describe('a question with a picture', () => {
  it('sends the picture as mime and data only, never the preview address', () => {
    const image = { mime: 'image/jpeg' as const, data: 'QUJD', preview: 'blob:x' };
    expect(tutorRequest({ conversationId: null, lessonId: undefined, text: 'Hỏi', language: 'vi', retry: false, image })).toEqual({
      message: 'Hỏi', language: 'vi', image: { mime: 'image/jpeg', data: 'QUJD' },
    });
  });

  it('keeps the preview on the question so the picture stays on screen', () => {
    const state = tutorReducer(initialTutorState([]), { type: 'send', text: 'Em gửi thầy ảnh này.', preview: 'blob:x' });
    expect(state.messages[0]).toEqual({ role: 'user', content: 'Em gửi thầy ảnh này.', preview: 'blob:x' });
    expect(tutorReducer(initialTutorState([]), { type: 'send', text: 'Hỏi' }).messages[0]).toEqual({ role: 'user', content: 'Hỏi' });
  });
});
