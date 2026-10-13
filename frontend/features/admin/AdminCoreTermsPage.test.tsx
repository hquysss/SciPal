// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { AdminCoreTermsPage } from './AdminCoreTermsPage';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@/components/nav/PageBreadcrumb', () => ({ PageBreadcrumb: () => null }));

const api = vi.hoisted(() => ({ subjects: vi.fn(), terms: vi.fn(), mark: vi.fn() }));
vi.mock('./adminSubjectsApi', () => ({ fetchAdminSubjects: api.subjects }));
vi.mock('./coreTermsApi', () => ({ fetchSubjectTerms: api.terms, markCoreTerms: api.mark }));

const S1 = '11111111-1111-4111-8111-111111111111';
const S2 = '22222222-2222-4222-8222-222222222222';
const subject = (id: string, name: string, over = {}) => ({ id, slug: id, name_vi: name, name_en: `${name} EN`, icon: '∑', sort_order: 1, archived_at: null, counts: {}, ...over });
const term = (id: string, vi: string, en: string, core = false) => ({ id, term_vi: vi, term_en: en, core });
const TERMS = [term('t1', 'Vòng lặp', 'Loop', true), term('t2', 'Môi trường', 'Environment'), term('t3', 'Mảng', 'Array', true)];

beforeEach(() => {
  api.subjects.mockResolvedValue({ ok: true, data: { subjects: [subject(S1, 'Tin học'), subject(S2, 'Cũ', { archived_at: '2026-01-01' })] } });
  api.terms.mockResolvedValue({ ok: true, data: { terms: TERMS } });
  api.mark.mockResolvedValue({ ok: true, data: { updated: 1 } });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const rows = () => screen.getAllByRole('checkbox', { name: /^(Vòng lặp|Môi trường|Mảng)/ });

describe('AdminCoreTermsPage', () => {
  it('lists the first subject in use with its terms, ticked when core, and a count', async () => {
    const { container } = render(<AdminCoreTermsPage />);
    expect(await screen.findByRole('checkbox', { name: /Vòng lặp/ })).toBeTruthy();
    expect(api.terms).toHaveBeenCalledWith(S1);
    expect(rows().map((r) => (r as HTMLInputElement).checked)).toEqual([true, false, true]);
    expect(screen.getByText('2/3 thuật ngữ cốt lõi')).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Cũ' })).toBeNull();
    expect(countRawColors(container.innerHTML).total).toBe(0);
  });

  it('ticking a term saves it at once; a failed save puts it back and says so', async () => {
    render(<AdminCoreTermsPage />);
    const box = (await screen.findByRole('checkbox', { name: /Môi trường/ })) as HTMLInputElement;
    fireEvent.click(box);
    expect(api.mark).toHaveBeenCalledWith({ term_ids: ['t2'], core: true });
    await waitFor(() => expect(box.checked).toBe(true));
    await screen.findByText('3/3 thuật ngữ cốt lõi');

    api.mark.mockResolvedValue({ ok: false, status: 500, error: { vi: 'Chưa lưu được thuật ngữ cốt lõi.', en: 'x' } });
    fireEvent.click(box);
    await screen.findByText('Chưa lưu được thuật ngữ cốt lõi.');
    expect(box.checked).toBe(true);
  });

  it('searches both names and filters by core or not yet set', async () => {
    render(<AdminCoreTermsPage />);
    await screen.findByRole('checkbox', { name: /Vòng lặp/ });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm thuật ngữ' }), { target: { value: 'arr' } });
    expect(rows()).toHaveLength(1);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm thuật ngữ' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Hiện' }), { target: { value: 'unset' } });
    expect(rows().map((r) => r.getAttribute('aria-label'))).toEqual(['Môi trường — Environment']);
  });

  it('turns every term of the subject on only after a confirmation', async () => {
    render(<AdminCoreTermsPage />);
    await screen.findByRole('checkbox', { name: /Vòng lặp/ });
    fireEvent.click(screen.getByRole('button', { name: 'Bật cho cả môn' }));
    expect(api.mark).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Bật cho cả môn' }));
    await waitFor(() => expect(api.mark).toHaveBeenCalledWith({ subject_id: S1, core: true }));
    await screen.findByText('3/3 thuật ngữ cốt lõi');
  });

  it('shows the error when the terms cannot be loaded', async () => {
    api.terms.mockResolvedValue({ ok: false, status: 0, error: { vi: 'Không tải được thuật ngữ.', en: 'x' } });
    render(<AdminCoreTermsPage />);
    expect(await screen.findByText('Không tải được thuật ngữ.')).toBeTruthy();
  });
});
