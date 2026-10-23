// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExamBlueprintList, ExamRoomHeader } from './ExamListNotices';
import type { BlueprintSummary } from './examQueries';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@/features/nav/StaffLinks', () => ({ StaffLinks: () => null }));

afterEach(cleanup);

const exam = (id: string, name: string, extra: Partial<BlueprintSummary> = {}): BlueprintSummary => ({
  id,
  name,
  grade: 11,
  subject_id: 's',
  subject_slug: 'informatics',
  subject_name_en: 'Informatics',
  subject_name_vi: 'Tin học',
  question_count: 16,
  format: 'generic',
  layout: null,
  ...extra,
});

describe('ExamBlueprintList gifted-student group', () => {
  it('lists hsg exams first and only in their own group', () => {
    render(<ExamBlueprintList blueprints={[exam('a', 'Đề thường'), exam('b', 'Sàng nguyên tố', { category: 'hsg' })]} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Bồi dưỡng HSG (1)', 'Đề luyện tập khác (1)']);
    const hsg = screen.getByRole('region', { name: 'Bồi dưỡng HSG' });
    expect(within(hsg).getByRole('heading', { level: 3, name: 'Tin học' })).toBeTruthy();
    expect(within(hsg).getByText('Sàng nguyên tố')).toBeTruthy();
    const other = screen.getByRole('region', { name: 'Đề luyện tập khác' });
    expect(within(other).queryByText('Sàng nguyên tố')).toBeNull();
  });

  it('has no hsg group without hsg exams', () => {
    render(<ExamBlueprintList blueprints={[exam('a', 'Đề thường')]} />);
    expect(screen.queryByRole('region', { name: 'Bồi dưỡng HSG' })).toBeNull();
  });

  it('puts a programming card first in the subject of Bồi dưỡng HSG and counts it', () => {
    render(
      <ExamBlueprintList
        blueprints={[exam('b', 'Sàng nguyên tố', { category: 'hsg' })]}
        hsgCoding={[{ slug: 'informatics', name_vi: 'Tin học', name_en: 'Informatics', count: 16 }]}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Bồi dưỡng HSG (2)' })).toBeTruthy();
    const links = within(screen.getByRole('region', { name: 'Bồi dưỡng HSG · Tin học' })).getAllByRole('link');
    expect(links[0]!.getAttribute('href')).toBe('/exam/hsg/informatics');
    expect(links[0]!.textContent).toContain('16 bài');
    expect(links[1]!.getAttribute('href')).toBe('/exam/b');
  });

  it('shows the programming card even when the subject has no hsg exam', () => {
    render(<ExamBlueprintList blueprints={[exam('a', 'Đề thường')]} hsgCoding={[{ slug: 'informatics', name_vi: 'Tin học', name_en: null, count: 3 }]} />);
    expect(screen.getByRole('link', { name: /Luyện lập trình/ }).getAttribute('href')).toBe('/exam/hsg/informatics');
  });
});

describe('ExamRoomHeader', () => {
  it('renders title, question count, and subject badge', () => {
    render(<ExamRoomHeader blueprint={exam('bp-1', 'Đề thi minh họa')} questionCount={40} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Đề thi minh họa' })).toBeTruthy();
    expect(screen.getByText('40 câu')).toBeTruthy();
    expect(screen.getByText('Tin học')).toBeTruthy();
  });

  it('renders source attribution when blueprint has source', () => {
    render(
      <ExamRoomHeader
        blueprint={exam('bp-2', 'ĐGNL 2026', {
          source: 'Đề thi chính thức ĐGNL ĐHQG-HCM 2026 · tailieuonthi.org',
        })}
        questionCount={120}
      />,
    );
    expect(screen.getByText(/tailieuonthi\.org/)).toBeTruthy();
    expect(screen.getByText(/^Nguồn:/)).toBeTruthy();
  });

  it('does not render source when blueprint has no source', () => {
    render(<ExamRoomHeader blueprint={exam('bp-3', 'Đề không nguồn')} questionCount={20} />);
    expect(screen.queryByText(/Nguồn/)).toBeNull();
  });
});
