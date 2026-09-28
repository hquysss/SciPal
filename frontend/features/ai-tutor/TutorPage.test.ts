import { describe, expect, it, vi } from 'vitest';
import { chatLessonId } from './TutorPage';

vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

describe('chatLessonId', () => {
  it('keeps the picked lesson for a chat that started empty, even once it has a conversation id', () => {
    expect(chatLessonId({ id: null, messages: [], lessonId: null }, 'picked')).toBe('picked');
    expect(chatLessonId({ id: 'c1', messages: [], lessonId: 'from-url' }, 'picked')).toBe('picked');
  });

  it('uses the stored lesson of an opened conversation', () => {
    expect(chatLessonId({ id: 'c1', messages: [{ role: 'user', content: 'Hỏi' }], lessonId: 'stored' }, null)).toBe('stored');
  });
});
