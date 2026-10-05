// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { AnswerPalette } from './AnswerPalette';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

afterEach(cleanup);

const sections = [
  { key: 'mc', title: { vi: 'Phần I. Trắc nghiệm nhiều lựa chọn', en: 'Part I' }, start: 0, count: 3 },
  { key: 'truefalse', title: { vi: 'Phần II. Trắc nghiệm đúng sai', en: 'Part II' }, start: 3, count: 2 },
];

describe('AnswerPalette', () => {
  it('shows one grid and no section headings without sections', () => {
    render(<AnswerPalette total={5} currentIndex={0} answers={{ 1: true }} onSelect={() => {}} />);
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(screen.getByText(/1 \/ 5/).textContent).toContain('đã làm');
  });

  it('groups cells under one heading per section and still counts answered / total', () => {
    const onSelect = vi.fn();
    render(<AnswerPalette total={5} currentIndex={3} answers={{ 0: true, 2: true, 4: true }} onSelect={onSelect} sections={sections} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Phần I. Trắc nghiệm nhiều lựa chọn',
      'Phần II. Trắc nghiệm đúng sai',
    ]);
    expect(screen.getByText(/3 \/ 5/).textContent).toContain('đã làm');
    const second = screen.getByRole('group', { name: 'Phần II. Trắc nghiệm đúng sai' });
    const cells = within(second).getAllByRole('button');
    expect(cells.map((c) => c.textContent)).toEqual(['4', '5']);
    expect(cells[0]!.getAttribute('aria-current')).toBe('step');
    fireEvent.click(cells[1]!);
    expect(onSelect).toHaveBeenCalledWith(4);
  });

  it('falls back to one grid when the sections do not cover every question', () => {
    render(<AnswerPalette total={6} currentIndex={0} answers={{}} onSelect={() => {}} sections={sections} />);
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('uses theme tokens only', () => {
    const html = renderToStaticMarkup(<AnswerPalette total={5} currentIndex={0} answers={{}} onSelect={() => {}} sections={sections} />);
    expect(countRawColors(html).total).toBe(0);
  });
});
