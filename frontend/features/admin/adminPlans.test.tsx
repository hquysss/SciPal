import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { PlanCard, AuditList } from './AdminPlansPage';
import { formFromPlan, patchFromForm, type AdminPlan } from './adminPlansApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const plus: AdminPlan = {
  code: 'student_plus', audience: 'student', name: { en: 'Student Plus', vi: 'Học sinh Plus' }, description: { en: 'More', vi: 'Nhiều hơn' }, perks: [{ en: 'All lessons', vi: 'Mọi bài học' }], version: 3,
  limits: [{ metric: 'tutor_requests', kind: 'monthly', limit: 200 }, { metric: 'graded_exam_attempts', kind: 'monthly', limit: 30 }],
  prices: { month: 39000, year: 390000 },
};
const free: AdminPlan = { ...plus, code: 'student_free', name: { en: 'Student Free', vi: 'Học sinh Miễn phí' }, prices: null, limits: [{ metric: 'tutor_requests', kind: 'daily', limit: 5 }] };

describe('patchFromForm', () => {
  it('turns the form into the save request with the version it was read at', () => {
    const form = { ...formFromPlan(plus), reason: '  Tăng Tutor ', limits: { tutor_requests: { kind: 'monthly', limit: '300' }, graded_exam_attempts: { kind: 'monthly', limit: '30' } }, month: '49000' };
    expect(patchFromForm(form, plus)).toEqual({
      ok: true,
      body: {
        expectedVersion: 3,
        reason: 'Tăng Tutor',
        limits: [{ metric: 'tutor_requests', kind: 'monthly', limit: 300 }, { metric: 'graded_exam_attempts', kind: 'monthly', limit: 30 }],
        description: { en: 'More', vi: 'Nhiều hơn' },
        perks: [{ en: 'All lessons', vi: 'Mọi bài học' }],
        prices: { month: 49000, year: 390000 },
      },
    });
  });

  it('asks for a reason and whole numbers, and sends no prices for a free plan', () => {
    expect(patchFromForm({ ...formFromPlan(plus), reason: ' ' }, plus)).toMatchObject({ ok: false });
    expect(patchFromForm({ ...formFromPlan(plus), reason: 'x', limits: { ...formFromPlan(plus).limits, tutor_requests: { kind: 'monthly', limit: '2.5' } } }, plus)).toMatchObject({ ok: false });
    expect(patchFromForm({ ...formFromPlan(plus), reason: 'x', year: '500' }, plus)).toMatchObject({ ok: false });
    expect(patchFromForm({ ...formFromPlan(plus), reason: 'x', perksEn: 'A\nB' }, plus)).toMatchObject({ ok: false });
    expect(patchFromForm({ ...formFromPlan(plus), reason: 'x', perksVi: '', perksEn: '' }, plus)).toMatchObject({ ok: true, body: { perks: [] } });
    const saved = patchFromForm({ ...formFromPlan(free), reason: 'x' }, free);
    expect(saved.ok && 'prices' in saved.body).toBe(false);
  });
});

describe('PlanCard', () => {
  it('shows the plan limits, the Tutor period choice, prices and a reason field', () => {
    const html = renderToStaticMarkup(<PlanCard plan={plus} onSaved={() => {}} />);
    expect(html).toContain('Học sinh Plus');
    expect(html).toContain('Lượt hỏi Gia sư AI');
    expect(html).toContain('Mỗi tháng');
    expect(html).toContain('value="200"');
    // Every counted quota chooses its period, not only Tutor.
    expect(html.match(/aria-label="Chu kỳ tính lượt: [^"]+"/g)).toHaveLength(2);
    expect(html).toContain('Giá theo tháng');
    expect(html).toContain('value="39000"');
    expect(html).toContain('Lý do thay đổi');
    expect(html).toContain('Đơn đã bán giữ giá cũ');
    expect(countRawColors(html).total).toBe(0);
  });

  it('has no price fields for a free plan', () => {
    const html = renderToStaticMarkup(<PlanCard plan={free} onSaved={() => {}} />);
    expect(html).not.toContain('Giá theo tháng');
    expect(html).toContain('Mỗi ngày');
  });
});

describe('AuditList', () => {
  it('lists recent changes with plan and reason', () => {
    const html = renderToStaticMarkup(<AuditList plans={[plus]} items={[{ id: 'x', planCode: 'student_plus', actorId: 'a', reason: 'Tăng Tutor', before: {}, after: {}, createdAt: '2026-09-29T02:00:00.000Z' }]} />);
    expect(html).toContain('Lịch sử thay đổi');
    expect(html).toContain('Học sinh Plus');
    expect(html).toContain('Tăng Tutor');
  });
});
