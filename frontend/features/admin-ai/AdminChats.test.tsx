import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { ChatList, ChatTranscript, chatListQuery } from './AdminChats';
import type { AdminConversation } from './api';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const conv = (patch: Partial<AdminConversation> = {}): AdminConversation => ({
  id: 'c1',
  title: 'Vòng lặp là gì?',
  student: { id: 's1', name: 'Nguyễn An' },
  lesson: { id: 'l1', title_vi: 'Vòng lặp', title_en: 'Loops' },
  messages: 6,
  created_at: '2026-09-28T03:00:00Z',
  updated_at: '2026-09-28T03:00:00Z',
  ...patch,
});

describe('chatListQuery', () => {
  it('sends only the filters that are set', () => {
    expect(chatListQuery({ q: '', from: '', to: '' })).toBe('');
    expect(chatListQuery({ q: ' An ', from: '2026-09-01', to: '' }, '2026-09-20T00:00:00Z')).toBe('?q=An&from=2026-09-01&before=2026-09-20T00%3A00%3A00Z');
  });
});

describe('ChatList', () => {
  it('shows the student, the title, the lesson and the number of messages', () => {
    const html = renderToStaticMarkup(<ChatList conversations={[conv(), conv({ id: 'c2', student: { id: 's2', name: null }, lesson: null, messages: 2 })]} onOpen={() => {}} />);
    expect(html).toContain('Nguyễn An');
    expect(html).toContain('Vòng lặp là gì?');
    expect(html).toContain('Bài: Vòng lặp');
    expect(html).toContain('6 tin');
    expect(html).toContain('Học sinh chưa đặt tên');
    expect(countRawColors(html).total).toBe(0);
  });

  it('says when nothing matches', () => {
    expect(renderToStaticMarkup(<ChatList conversations={[]} onOpen={() => {}} />)).toContain('Không có hội thoại nào');
  });
});

describe('ChatTranscript', () => {
  it('shows every message, the student’s and the tutor’s, read only', () => {
    const html = renderToStaticMarkup(
      <ChatTranscript
        conversation={conv()}
        messages={[{ role: 'user', content: 'Vòng lặp là gì?' }, { role: 'assistant', content: 'Em thử nghĩ **một** bước.' }]}
        onBack={() => {}}
      />,
    );
    expect(html).toContain('Nguyễn An');
    expect(html).toMatch(/<strong[^>]*>một<\/strong>/);
    expect(html).not.toMatch(/<textarea|Xóa/);
  });
});
