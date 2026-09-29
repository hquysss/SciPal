import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReportFormView, ReportProblemCard } from './ReportProblem';
import { ProblemReportsPanelView } from './ProblemReportsPanel';
import type { ProblemReport } from './problemReportsApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@/lib/supabase', () => ({ createBrowserClient: () => ({}) }));

const noop = () => {};
const report: ProblemReport = {
  id: 'r1', user_id: null, email: null, category: 'content', message: 'Bài 3 ghi sai công thức', page_url: 'javascript:alert(1)',
  user_agent: null, status: 'open', created_at: '2026-10-01T00:00:00Z',
};

describe('report form', () => {
  it('asks what, what happened, and an e-mail only for visitors', () => {
    const guest = renderToStaticMarkup(<ReportFormView state={{ kind: 'form', sending: false, error: null }} askEmail onSubmit={noop} onClose={noop} />);
    expect(guest).toContain('Nội dung bài học sai');
    expect(guest).toContain('Chuyện gì đã xảy ra?');
    expect(guest).toContain('name="email"');
    expect(guest).toContain('minLength="10"');
    const member = renderToStaticMarkup(<ReportFormView state={{ kind: 'form', sending: false, error: null }} askEmail={false} onSubmit={noop} onClose={noop} />);
    expect(member).not.toContain('name="email"');
  });

  it('shows the error, the sending state and the thanks', () => {
    const failed = renderToStaticMarkup(<ReportFormView state={{ kind: 'form', sending: true, error: { vi: 'Thử lại sau', en: 'x' } }} askEmail={false} onSubmit={noop} onClose={noop} />);
    expect(failed).toContain('Thử lại sau');
    expect(failed).toContain('Đang gửi…');
    expect(renderToStaticMarkup(<ReportFormView state={{ kind: 'sent' }} askEmail={false} onSubmit={noop} onClose={noop} />)).toContain('Cảm ơn bạn');
  });

  it('offers the form from the profile card', () => {
    const html = renderToStaticMarkup(<ReportProblemCard />);
    expect(html).toContain('Gặp vấn đề?');
    expect(html).toContain('Báo cáo vấn đề');
  });
});

describe('admin reports panel', () => {
  it('lists open reports and never links an unsafe page address', () => {
    const html = renderToStaticMarkup(<ProblemReportsPanelView reports={[report]} busyId={null} error={null} onResolve={noop} />);
    expect(html).toContain('Bài 3 ghi sai công thức');
    expect(html).toContain('Khách, không để email');
    expect(html).toContain('Đã xử lý');
    expect(html).not.toContain('javascript:');
    expect(renderToStaticMarkup(<ProblemReportsPanelView reports={[]} busyId={null} error={null} onResolve={noop} />)).toBe('');
  });
});
