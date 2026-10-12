// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlockedListView } from './BlockedList';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

afterEach(cleanup);

describe('BlockedListView', () => {
  it('lists blocked people and unblocks one by user id', () => {
    const onUnblock = vi.fn();
    render(<BlockedListView blocked={[{ user_id: 'u1', display_name: 'An', avatar_url: null }, { user_id: 'u2', display_name: null, avatar_url: null }]} onUnblock={onUnblock} />);
    expect(screen.getByText('An')).toBeTruthy();
    expect(screen.getByText('Người dùng')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Bỏ chặn' })[0]);
    expect(onUnblock).toHaveBeenCalledWith('u1');
  });

  it('shows nothing when no one is blocked', () => {
    const { container } = render(<BlockedListView blocked={[]} onUnblock={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
