import { describe, expect, it } from 'vitest';
import { initialTutorState, tutorReducer } from './useTutorChat';

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
