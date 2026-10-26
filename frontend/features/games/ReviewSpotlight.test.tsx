// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReviewSpotlightView } from './ReviewSpotlight';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@/lib/supabase', () => ({ createBrowserClient: vi.fn() }));

afterEach(cleanup);

describe('ReviewSpotlightView', () => {
  it('shows the due count, the English side of the next words and both doors', () => {
    render(<ReviewSpotlightView summary={{ due: 5, total: 12, preview: ['algorithm', 'loop', 'variable'], nextDue: null }} />);
    expect(screen.getByRole('heading', { name: '5 từ cần ôn hôm nay' })).toBeTruthy();
    const next = screen.getByRole('list', { name: 'Các từ sắp ôn' });
    expect(next.textContent).toContain('algorithm');
    expect(next.textContent).toContain('+2');
    expect(screen.getByRole('link', { name: /Ôn ngay/ }).getAttribute('href')).toBe('/review');
    expect(screen.getByRole('link', { name: /Sổ từ \(12 từ\)/ }).getAttribute('href')).toBe('/glossary?filter=saved');
  });

  it('says when today is done, and points an empty list to the glossary', () => {
    const { rerender } = render(<ReviewSpotlightView summary={{ due: 0, total: 4, preview: [], nextDue: null }} />);
    expect(screen.getByRole('heading', { name: 'Xong phần ôn hôm nay' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
    rerender(<ReviewSpotlightView summary={{ due: 0, total: 0, preview: [], nextDue: null }} />);
    expect(screen.queryByRole('link', { name: /Ôn ngay|Mở trang ôn/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Mở từ điển/ }).getAttribute('href')).toBe('/glossary');
  });

  it('shows nothing when the summary cannot be read', () => {
    const { container } = render(<ReviewSpotlightView summary={null} />);
    expect(container.innerHTML).toBe('');
  });
});
