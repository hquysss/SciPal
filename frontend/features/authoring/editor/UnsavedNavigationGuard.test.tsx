// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnsavedNavigationGuard } from './UnsavedNavigationGuard';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ t: (copy: { vi: string }) => copy.vi }) }));

afterEach(() => {
  cleanup();
  push.mockReset();
});

describe('UnsavedNavigationGuard', () => {
  it('stays in the editor when the visitor cancels', () => {
    render(
      <>
        <a href="/teacher/lessons">Lesson list</a>
        <UnsavedNavigationGuard hasUnsavedWork={() => true} />
      </>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Lesson list' }));
    expect(screen.getByRole('dialog', { name: 'Rời trang soạn?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ở lại' }));

    expect(push).not.toHaveBeenCalled();
  });

  it('navigates after the visitor confirms', async () => {
    render(
      <>
        <a href="/teacher/lessons">Lesson list</a>
        <UnsavedNavigationGuard hasUnsavedWork={() => true} />
      </>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Lesson list' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rời trang' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/teacher/lessons'));
  });
});
