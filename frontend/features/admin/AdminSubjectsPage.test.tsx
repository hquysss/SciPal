// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import type { AdminSubject } from './adminSubjectsApi';
import { AdminSubjectsPage } from './AdminSubjectsPage';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));
vi.mock('@/components/nav/PageBreadcrumb', () => ({ PageBreadcrumb: () => null }));

const fetchAdminSubjects = vi.fn();
const archiveSubject = vi.fn();
const restoreSubject = vi.fn();
vi.mock('./adminSubjectsApi', () => ({
  fetchAdminSubjects: (...a: unknown[]) => fetchAdminSubjects(...a),
  archiveSubject: (...a: unknown[]) => archiveSubject(...a),
  restoreSubject: (...a: unknown[]) => restoreSubject(...a),
}));

const subject = (id: string, name: string, over: Partial<AdminSubject> = {}): AdminSubject => ({
  id, slug: id, name_vi: name, name_en: `${name} EN`, icon: '∑', sort_order: 1, archived_at: null,
  counts: { topics: 2, lessons_published: 3, lessons_draft: 1, questions: 40, classes: 5 }, ...over,
});

afterEach(() => {
  cleanup();
  fetchAdminSubjects.mockReset();
  archiveSubject.mockReset();
  restoreSubject.mockReset();
});

const ready = (subjects: AdminSubject[]) => fetchAdminSubjects.mockResolvedValue({ ok: true, data: { subjects } });

describe('AdminSubjectsPage', () => {
  it('lists subjects in the API order with counts, and deleted ones in their own section', async () => {
    ready([subject('a', 'Tin học'), subject('b', 'Toán', { counts: { topics: 0, lessons_published: 0, lessons_draft: 0, questions: 0, classes: 0 } }), subject('c', 'Lý', { archived_at: '2026-10-05T00:00:00Z' })]);
    render(<AdminSubjectsPage />);
    const inUse = await screen.findByRole('region', { name: 'Đang dùng' });
    const names = within(inUse).getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(names[0]).toContain('Tin học');
    expect(names[0]).toContain('3 bài đã xuất bản · 1 bản nháp · 40 câu hỏi · 5 lớp');
    expect(names[1]).toContain('Toán');
    const removed = screen.getByRole('region', { name: 'Đã xóa' });
    expect(within(removed).getByText('Lý')).toBeTruthy();
  });

  it('asks before deleting, then moves the subject to the deleted section', async () => {
    ready([subject('a', 'Tin học')]);
    archiveSubject.mockResolvedValue({ ok: true, data: { subject: subject('a', 'Tin học', { archived_at: '2026-10-05T00:00:00Z' }) } });
    render(<AdminSubjectsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa môn' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Không có gì bị xóa');
    expect(archiveSubject).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa môn' }));
    await waitFor(() => expect(archiveSubject).toHaveBeenCalledWith('a'));
    const removed = await screen.findByRole('region', { name: 'Đã xóa' });
    await waitFor(() => expect(within(removed).getByText('Tin học')).toBeTruthy());
  });

  it('restores a deleted subject', async () => {
    ready([subject('a', 'Tin học', { archived_at: '2026-10-05T00:00:00Z' })]);
    restoreSubject.mockResolvedValue({ ok: true, data: { subject: subject('a', 'Tin học') } });
    render(<AdminSubjectsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Khôi phục' }));
    await waitFor(() => expect(restoreSubject).toHaveBeenCalledWith('a'));
    const inUse = await screen.findByRole('region', { name: 'Đang dùng' });
    await waitFor(() => expect(within(inUse).getByText(/Tin học/)).toBeTruthy());
  });

  it('shows the API error and leaves the row where it was', async () => {
    ready([subject('a', 'Tin học')]);
    archiveSubject.mockResolvedValue({ ok: false, status: 500, error: { vi: 'Không ẩn được môn học.', en: 'Could not hide the subject.' } });
    render(<AdminSubjectsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa môn' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Xóa môn' }));
    expect(await screen.findByText('Không ẩn được môn học.')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Đang dùng' })).getByText(/Tin học/)).toBeTruthy();
  });

  it('shows a load error', async () => {
    fetchAdminSubjects.mockResolvedValue({ ok: false, status: 403, error: { vi: 'Không có quyền.', en: 'Forbidden.' } });
    render(<AdminSubjectsPage />);
    expect(await screen.findByText('Không có quyền.')).toBeTruthy();
  });

  it('uses theme tokens only', async () => {
    const { readFileSync } = await import('node:fs');
    expect(countRawColors(readFileSync(`${__dirname}/AdminSubjectsPage.tsx`, 'utf8')).total).toBe(0);
  });
});
