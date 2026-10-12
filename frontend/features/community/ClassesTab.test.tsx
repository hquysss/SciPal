// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClassListView } from './ClassesTab';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

afterEach(cleanup);

describe('ClassListView', () => {
  it('lists the classes and opens one by id', () => {
    const onOpen = vi.fn();
    render(<ClassListView state={{ status: 'ready', classes: [{ id: 'c1', name: 'Lớp 10A' }, { id: 'c2', name: 'Tin 11' }] }} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Tin 11/ }));
    expect(onOpen).toHaveBeenCalledWith('c2');
    expect(screen.getByText('Lớp 10A')).toBeTruthy();
  });

  it('says so when you are in no class yet', () => {
    render(<ClassListView state={{ status: 'ready', classes: [] }} onOpen={vi.fn()} />);
    expect(screen.getByText('Chưa có lớp nào')).toBeTruthy();
  });

  it('shows a loading note and an error', () => {
    const { rerender } = render(<ClassListView state={{ status: 'loading' }} onOpen={vi.fn()} />);
    expect(screen.getByRole('status')).toBeTruthy();
    rerender(<ClassListView state={{ status: 'error', message: { vi: 'Lỗi', en: 'Error' } }} onOpen={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('Lỗi');
  });
});
