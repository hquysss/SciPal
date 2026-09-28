import { describe, expect, it } from 'vitest';
import type { AccountQuotaSnapshot } from './quotasApi';
import { belowUsage, changesFrom, fromVietnamLocal, quotaLabel, rowsFrom, toVietnamLocal, validRow } from './quotaForm';

const snapshot: AccountQuotaSnapshot = {
  account: { id: 'u1', plan: 'student_free', paidThrough: null },
  version: 2,
  quotas: [
    { metric: 'graded_exam_attempts', kind: 'monthly', limit: 3, planLimit: 3, used: 1, reserved: 0, source: 'plan', expiresAt: null, resetsAt: '2026-09-30T17:00:00.000Z' },
    { metric: 'tutor_requests', kind: 'monthly', limit: 500, planLimit: 10, used: 40, reserved: 2, source: 'override', expiresAt: '2026-10-31T16:59:00.000Z', resetsAt: '2026-09-30T17:00:00.000Z' },
  ],
};

describe('Vietnam local time', () => {
  it('shows and reads datetimes in Vietnam time (UTC+7)', () => {
    expect(toVietnamLocal('2026-10-31T16:59:00.000Z')).toBe('2026-10-31T23:59');
    expect(fromVietnamLocal('2026-10-31T23:59')).toBe('2026-10-31T16:59:00.000Z');
    expect(fromVietnamLocal('')).toBeNull();
  });
});

describe('quotaLabel', () => {
  it('says per day or per month from the quota kind', () => {
    expect(quotaLabel('tutor_requests', 'daily').vi).toBe('Lượt Tutor mỗi ngày');
    expect(quotaLabel('tutor_requests', 'monthly').vi).toBe('Lượt Tutor mỗi tháng');
    expect(quotaLabel('active_classes', 'capacity').vi).toBe('Lớp đang hoạt động');
  });
});

describe('rowsFrom and changesFrom', () => {
  it('starts from what is in force and sends nothing when nothing changed', () => {
    const rows = rowsFrom(snapshot);
    expect(rows).toEqual([
      { metric: 'graded_exam_attempts', mode: 'plan', limit: '3', expires: '' },
      { metric: 'tutor_requests', mode: 'custom', limit: '500', expires: '2026-10-31T23:59' },
    ]);
    expect(changesFrom(snapshot, rows)).toEqual([]);
  });

  it('sends a set for a new or edited custom value and a reset for back-to-plan', () => {
    const rows = rowsFrom(snapshot);
    rows[0] = { ...rows[0], mode: 'custom', limit: '0' };
    rows[1] = { ...rows[1], mode: 'plan' };
    expect(changesFrom(snapshot, rows)).toEqual([
      { metric: 'graded_exam_attempts', action: 'set', limit: 0, expiresAt: null },
      { metric: 'tutor_requests', action: 'reset' },
    ]);
    const edited = rowsFrom(snapshot);
    edited[1] = { ...edited[1], expires: '' };
    expect(changesFrom(snapshot, edited)).toEqual([{ metric: 'tutor_requests', action: 'set', limit: 500, expiresAt: null }]);
  });
});

describe('validRow and belowUsage', () => {
  const now = new Date('2026-09-15T00:00:00Z');
  it('accepts whole numbers ≥ 0 and a future expiry only', () => {
    expect(validRow({ metric: 'tutor_requests', mode: 'custom', limit: '0', expires: '' }, now)).toBe(true);
    expect(validRow({ metric: 'tutor_requests', mode: 'custom', limit: '1.5', expires: '' }, now)).toBe(false);
    expect(validRow({ metric: 'tutor_requests', mode: 'custom', limit: '-1', expires: '' }, now)).toBe(false);
    expect(validRow({ metric: 'tutor_requests', mode: 'custom', limit: '', expires: '' }, now)).toBe(false);
    expect(validRow({ metric: 'tutor_requests', mode: 'custom', limit: '5', expires: '2026-09-01T00:00' }, now)).toBe(false);
    expect(validRow({ metric: 'tutor_requests', mode: 'plan', limit: '', expires: '' }, now)).toBe(true);
  });

  it('warns when the new limit is under what is already used or held', () => {
    const quota = snapshot.quotas[1];
    expect(belowUsage({ metric: 'tutor_requests', mode: 'custom', limit: '41', expires: '' }, quota)).toBe(true);
    expect(belowUsage({ metric: 'tutor_requests', mode: 'custom', limit: '42', expires: '' }, quota)).toBe(false);
    expect(belowUsage({ metric: 'tutor_requests', mode: 'plan', limit: '', expires: '' }, quota)).toBe(true);
  });
});
