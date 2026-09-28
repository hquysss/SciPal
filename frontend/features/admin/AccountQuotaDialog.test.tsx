import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { AccountQuotaForm } from './AccountQuotaDialog';
import type { AccountQuotaSnapshot } from './quotasApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const snapshot: AccountQuotaSnapshot = {
  account: { id: 'u1', plan: 'student_free', paidThrough: null },
  version: 2,
  quotas: [
    { metric: 'graded_exam_attempts', kind: 'monthly', limit: 3, planLimit: 3, used: 1, reserved: 0, source: 'plan', expiresAt: null, resetsAt: '2026-09-30T17:00:00.000Z' },
    { metric: 'tutor_requests', kind: 'monthly', limit: 30, planLimit: 10, used: 40, reserved: 0, source: 'override', expiresAt: null, resetsAt: '2026-09-30T17:00:00.000Z' },
  ],
};
const audit = [{ id: 'e1', actor: { id: 'a1', name: 'Cô Hà' }, before: {}, after: { tutor_requests: { limit: 30, expires_at: null } }, reason: 'Lớp chuyên', createdAt: '2026-09-20T03:00:00.000Z' }];

describe('AccountQuotaForm', () => {
  const html = renderToStaticMarkup(<AccountQuotaForm accountId="u1" initial={snapshot} initialAudit={{ entries: audit, next: null }} onSaved={() => {}} />);

  it('shows the plan, each quota with usage, the plan default and whether it is custom', () => {
    expect(html).toContain('Học sinh Miễn phí');
    expect(html).toContain('Lượt Tutor mỗi tháng');
    expect(html).toContain('Lượt thi chấm điểm mỗi tháng');
    expect(html).toContain('Theo gói (10)');
    expect(html).toContain('Đã dùng 40');
    expect(html).toContain('Riêng tài khoản này');
    expect(countRawColors(html).total).toBe(0);
  });

  it('warns when a limit is under usage, and says 0 blocks the feature', () => {
    expect(html).toContain('thấp hơn số đã dùng');
    expect(html).toContain('0 = không được dùng');
  });

  it('asks for a reason and cannot save untouched', () => {
    expect(html).toMatch(/<textarea[^>]*required/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Lưu hạn mức<\/button>/);
  });

  it('lists the audit: who, when, what and why', () => {
    expect(html).toContain('Cô Hà');
    expect(html).toContain('Lớp chuyên');
    expect(html).toContain('Lượt Tutor mỗi tháng: 30');
  });
});
