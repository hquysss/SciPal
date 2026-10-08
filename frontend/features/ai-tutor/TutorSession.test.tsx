// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TutorProvider, useTutorSession } from './TutorSession';
import { AiTutorButton } from './AiTutorButton';
import { TutorPage } from './TutorPage';
import { GuestTutorView } from '../guest/GuestTutor';

const quota = vi.hoisted(() => ({ delayed: false, release: () => {} }));
const env = vi.hoisted(() => ({ path: '/', holdConversation: false, changedAccount: false, releaseConversation: () => {}, auth: (_event: string, _session: { user: { id: string } } | null) => {}, events: (_event: unknown) => {} }));
vi.mock('next/navigation', () => ({ usePathname: () => env.path, useRouter: () => ({ replace: () => {} }) }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({ auth: {
  getSession: async () => ({ data: { session: { user: { id: 'student-1' } } } }),
  onAuthStateChange: (callback: typeof env.auth) => { env.auth = callback; return { data: { subscription: { unsubscribe: () => {} } } }; },
} }) }));
vi.mock('./api', () => ({ getConversation: async (id: string) => {
  if (env.holdConversation) {
    env.holdConversation = false;
    await new Promise<void>((resolve) => { env.releaseConversation = resolve; });
    return { ok: true, data: { conversation: { id, lesson_id: null }, messages: [{ role: 'user', content: 'Nội dung tài khoản cũ' }] } };
  }
  if (env.changedAccount) return { ok: false, status: 404, error: { vi: 'Không tìm thấy hội thoại này.', en: 'Not found' } };
  return { ok: true, data: { conversation: { id, lesson_id: null }, messages: [{ role: 'user', content: 'Đã tải ' + id }] } };
}, listConversations: async () => ({ ok: true, data: { conversations: [] } }), getTutorQuota: async () => {
  if (quota.delayed) await new Promise<void>((resolve) => { quota.release = resolve; });
  return { ok: true, data: { remaining: 3, period: 'day' } };
} }));
vi.mock('./streamTutor', () => ({ streamTutor: async (_body: unknown, callback: typeof env.events) => {
  env.events = callback;
  callback({ event: 'meta', conversation_id: 'c1', remaining: 2, period: 'day' });
  callback({ event: 'delta', text: 'Gợi ý đầu' });
  return new Promise<{ ok: true }>(() => {});
} }));

function Probe() {
  const session = useTutorSession();
  if (!session) return null;
  return <>
    <button onClick={() => void session.chat.send('Câu trước')}>Gửi thử</button>
    <input aria-label="Nháp" value={session.draft} onChange={(e) => session.setDraft(e.target.value)} />
    <output>{session.chat.messages.map((m) => m.content).join('|')}</output>
    <p>{session.lesson?.title.vi ?? 'Không có bài'}</p>
    <p>{session.chat.remaining ?? 'Chưa có quota'}</p>
  </>;
}
afterEach(() => { cleanup(); env.path = '/'; quota.delayed = false; env.holdConversation = false; env.changedAccount = false; });

describe('shared tutor session', () => {
  it('loads quota before asking and preserves a stream and draft across routes', async () => {
    const ui = (lesson: boolean) => <TutorProvider><Probe />{lesson && <AiTutorButton lessonId="l2" lessonTitle={{ vi: 'Bài mới', en: 'New lesson' }} level="upper_secondary" />}</TutorProvider>;
    const view = render(ui(false));
    await screen.findByText('3');
    fireEvent.change(screen.getByLabelText('Nháp'), { target: { value: 'Nháp đang viết' } });
    fireEvent.click(screen.getByText('Gửi thử'));
    await screen.findByText('Câu trước|Gợi ý đầu');
    env.path = '/informatics/new';
    view.rerender(ui(true));
    await screen.findByText('Bài mới');
    expect(screen.getByLabelText('Nháp')).toHaveProperty('value', 'Nháp đang viết');
    act(() => env.events({ event: 'delta', text: ' tiếp' }));
    expect(screen.getByText('Câu trước|Gợi ý đầu tiếp')).toBeTruthy();
    env.path = '/glossary';
    view.rerender(ui(false));
    await screen.findByText('Không có bài');
    expect(screen.getByText('Câu trước|Gợi ý đầu tiếp')).toBeTruthy();
  });

  it('continues the floating chat and its draft on the full Professor page', async () => {
    const view = render(<TutorProvider><Probe /></TutorProvider>);
    await screen.findByText('3');
    fireEvent.click(screen.getByText('Gửi thử'));
    await screen.findByText('Câu trước|Gợi ý đầu');
    fireEvent.change(screen.getByLabelText('Nháp'), { target: { value: 'Nháp sang trang Giáo sư' } });
    env.path = '/tutor';
    view.rerender(<TutorProvider><TutorPage level="upper_secondary" lessons={[]} /></TutorProvider>);
    expect(await screen.findByLabelText('Câu hỏi của em')).toHaveProperty('value', 'Nháp sang trang Giáo sư');
    expect(screen.getByText('Câu trước')).toBeTruthy();
    act(() => env.events({ event: 'delta', text: ' ở trang đầy đủ' }));
    await screen.findByText('Gợi ý đầu ở trang đầy đủ');
    expect(screen.getByText('Còn 2 lượt hôm nay')).toBeTruthy();
  });

  it('honours a changed conversation query without remounting the Professor page', async () => {
    env.path = '/tutor';
    const view = render(<TutorProvider><TutorPage level="upper_secondary" lessons={[]} initialConversationId="c1" /></TutorProvider>);
    await screen.findByText('Đã tải c1');
    view.rerender(<TutorProvider><TutorPage level="upper_secondary" lessons={[]} initialConversationId="c2" /></TutorProvider>);
    await screen.findByText('Đã tải c2');
    expect(screen.queryByText('Đã tải c1')).toBeNull();
  });

  it('accepts initial quota even if the saved conversation finishes loading first', async () => {
    quota.delayed = true;
    env.path = '/tutor';
    render(<TutorProvider><TutorPage level="upper_secondary" lessons={[]} initialConversationId="c1" /></TutorProvider>);
    await screen.findByText('Đã tải c1');
    await act(async () => quota.release());
    await screen.findByText('Còn 3 lượt hôm nay');
  });

  it('rejects a previous account response before the new account render commits', async () => {
    env.path = '/tutor'; env.holdConversation = true;
    render(<TutorProvider><TutorPage level="upper_secondary" lessons={[]} initialConversationId="c1" /></TutorProvider>);
    await waitFor(() => expect(env.holdConversation).toBe(false));
    await act(async () => {
      env.changedAccount = true;
      env.auth('SIGNED_IN', { user: { id: 'student-2' } });
      env.releaseConversation();
      await Promise.resolve();
    });
    await screen.findByText('Không tìm thấy hội thoại này.');
    expect(screen.queryByText('Nội dung tài khoản cũ')).toBeNull();
  });

  it('clears private chat and draft when the account changes, ignoring the previous stream', async () => {
    render(<TutorProvider><Probe /></TutorProvider>);
    await screen.findByText('3');
    fireEvent.click(screen.getByText('Gửi thử'));
    await screen.findByText('Câu trước|Gợi ý đầu');
    fireEvent.change(screen.getByLabelText('Nháp'), { target: { value: 'Bí mật' } });
    act(() => env.auth('SIGNED_IN', { user: { id: 'student-2' } }));
    act(() => env.events({ event: 'delta', text: ' trễ' }));
    await waitFor(() => expect(screen.queryByText(/Câu trước/)).toBeNull());
    expect(screen.getByLabelText('Nháp')).toHaveProperty('value', '');
  });
});

it('gives each guest view its own input and heading associations', () => {
  const props = { state: { status: 'idle' as const }, question: '', onQuestion: () => {}, onAsk: () => {} };
  render(<><GuestTutorView {...props} /><GuestTutorView {...props} /></>);
  const inputs = screen.getAllByRole('textbox');
  const labels = screen.getAllByText('Câu hỏi của em');
  labels.forEach((label, index) => { expect(label instanceof HTMLLabelElement && label.control === inputs[index]).toBe(true); });
  const headings = screen.getAllByRole('heading', { name: 'Hỏi thử 1 câu' });
  const regions = screen.getAllByRole('region', { name: 'Hỏi thử 1 câu' });
  expect(new Set(headings.map((heading) => heading.id)).size).toBe(2);
  regions.forEach((region, index) => expect(region.getAttribute('aria-labelledby')).toBe(headings[index]?.id));
});
