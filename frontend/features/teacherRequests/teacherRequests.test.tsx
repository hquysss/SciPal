import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TeacherRequestCardView } from './TeacherRequestCard';
import { TeacherRequestsPanelView } from './TeacherRequestsPanel';
import type { TeacherRequest } from './teacherRequestsApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@/lib/supabase', () => ({ createBrowserClient: () => ({}) }));

const request = (over: Partial<TeacherRequest> = {}): TeacherRequest => ({
  id: 'r1',
  user_id: 'u1',
  email: 'an@gmail.com',
  display_name: 'Lê An',
  school: 'THPT Nguyễn Du',
  subject: 'Tin học',
  note: 'Dạy lớp 10',
  evidence_url: 'https://thpt.edu.vn/gv/an',
  status: 'pending',
  review_note: null,
  reviewed_at: null,
  created_at: '2026-09-30T02:00:00Z',
  ...over,
});
const noop = () => {};
const card = (state: Parameters<typeof TeacherRequestCardView>[0]['state']) =>
  renderToStaticMarkup(<TeacherRequestCardView state={state} onOpen={noop} onCancel={noop} onSubmit={noop} onClose={noop} />);

describe('TeacherRequestCardView', () => {
  it('invites a student to ask', () => {
    const html = card({ kind: 'none' });
    expect(html).toContain('Bạn là giáo viên?');
    expect(html).toContain('Gửi yêu cầu');
  });

  it('asks for school and subject, the rest optional', () => {
    const html = card({ kind: 'form', sending: false, error: null });
    expect(html).toMatch(/<input[^>]*id="teacher-school"[^>]*required=""/);
    expect(html).toMatch(/<input[^>]*id="teacher-subject"[^>]*required=""/);
    expect(html).toContain('id="teacher-note"');
    expect(html).toMatch(/<input[^>]*id="teacher-evidence"[^>]*type="url"/);
  });

  it('shows a pending request and lets it be cancelled', () => {
    const html = card({ kind: 'request', request: request(), busy: false });
    expect(html).toContain('Đang chờ duyệt');
    expect(html).toContain('THPT Nguyễn Du');
    expect(html).toContain('Hủy yêu cầu');
  });

  it('gives the reason of a refusal and a way to ask again', () => {
    const html = card({ kind: 'request', request: request({ status: 'rejected', review_note: 'Thiếu minh chứng' }), busy: false });
    expect(html).toContain('Thiếu minh chứng');
    expect(html).toContain('Gửi lại yêu cầu');
  });
});

describe('TeacherRequestsPanelView', () => {
  const panel = (requests: TeacherRequest[], rejecting: string | null = null) =>
    renderToStaticMarkup(
      <TeacherRequestsPanelView requests={requests} busyId={null} rejecting={rejecting} reason="" error={null} onApprove={noop} onStartReject={noop} onReason={noop} onReject={noop} onCancelReject={noop} lang="vi" />,
    );

  it('lists who asked, where they teach and their evidence', () => {
    const html = panel([request()]);
    expect(html).toContain('Yêu cầu làm giáo viên');
    expect(html).toContain('an@gmail.com');
    expect(html).toContain('THPT Nguyễn Du · Tin học');
    expect(html).toMatch(/<a[^>]*href="https:\/\/thpt.edu.vn\/gv\/an"[^>]*rel="noopener noreferrer nofollow"/);
    expect(html).toContain('Duyệt');
    expect(html).toContain('Từ chối');
  });

  it('never links evidence that is not http(s)', () => {
    expect(panel([request({ evidence_url: 'javascript:alert(1)' })])).not.toContain('javascript:');
  });

  it('asks the reason before refusing', () => {
    const html = panel([request()], 'r1');
    expect(html).toContain('id="reject-reason-r1"');
    expect(html).toContain('Xác nhận từ chối');
  });

  it('stays out of the way when nothing waits', () => {
    expect(panel([])).toBe('');
  });
});
