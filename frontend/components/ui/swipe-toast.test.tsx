// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// jsdom has no AnimationEvent, and React then does not listen for animationend.
vi.hoisted(() => {
  (window as unknown as { AnimationEvent?: unknown }).AnimationEvent ??= class AnimationEvent extends Event {};
});

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

import { SwipeToast } from './swipe-toast';

afterEach(cleanup);

describe('SwipeToast', () => {
  it('shows its title and line as a status message', () => {
    render(<SwipeToast title="Đã nộp bài thi" description="Điểm 7 / 10" />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Đã nộp bài thi');
    expect(status.textContent).toContain('Điểm 7 / 10');
  });

  it('closes with its reason when the close cross is pressed', async () => {
    const onClose = vi.fn();
    render(<SwipeToast title="Chào" onClose={onClose} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledWith('close'));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<SwipeToast title="Chào" onClose={onClose} />);
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('status'), { key: 'Escape' });
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledWith('escape'));
  });

  it('closes by itself when the line has burned down', async () => {
    const onClose = vi.fn();
    const { container } = render(<SwipeToast title="Chào" duration={4000} onClose={onClose} />);
    const fuse = container.querySelector('[data-fuse]') as HTMLElement;
    expect(fuse.style.animationDuration).toBe('4000ms');
    await act(async () => {
      fireEvent.animationEnd(fuse);
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledWith('timeout'));
  });

  it('has no burning line when it is meant to stay', () => {
    const { container } = render(<SwipeToast title="Chào" duration={0} />);
    expect(container.querySelector('[data-fuse]')).toBeNull();
  });

  it('lights as many marks as the count, out of the total', () => {
    const { container } = render(<SwipeToast title="Rời trang" tone="warning" pips={{ filled: 2, total: 3 }} />);
    const on = [...container.querySelectorAll('[data-on]')].map((el) => el.getAttribute('data-on'));
    expect(on).toEqual(['true', 'true', 'false']);
  });

  it('runs the action, then closes', async () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(<SwipeToast title="Chào" actionLabel="Xem" onAction={onAction} onClose={onClose} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Xem' }));
    });
    expect(onAction).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onClose).toHaveBeenCalledWith('action'));
  });
});
