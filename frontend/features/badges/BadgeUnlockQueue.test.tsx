// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { NewBadge } from '@scipal/types';
import { BadgeUnlockQueue } from './BadgeUnlockQueue';

const t = (text: { vi: string }) => text.vi;
const badge = (slug: string): NewBadge => ({ slug, name_vi: `Huy hiệu ${slug}`, name_en: slug, icon: '🎯', tier: 'bronze' });

afterEach(cleanup);

describe('BadgeUnlockQueue', () => {
  it('shows new badges one at a time; Escape moves to the next', () => {
    const { rerender } = render(<BadgeUnlockQueue badges={[]} t={t} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<BadgeUnlockQueue badges={[badge('a'), badge('b')]} t={t} />);
    expect(screen.getByRole('dialog', { name: 'Mở khoá huy hiệu!' }).textContent).toContain('Huy hiệu a');
    expect(screen.getByText('Còn 1 huy hiệu nữa')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog').textContent).toContain('Huy hiệu b');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not show again the badges there on mount, unless fromStart', () => {
    render(<BadgeUnlockQueue badges={[badge('a')]} t={t} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    cleanup();
    render(<BadgeUnlockQueue badges={[badge('a')]} fromStart t={t} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('waits while paused (a level up is open)', () => {
    const { rerender } = render(<BadgeUnlockQueue badges={[]} paused t={t} />);
    rerender(<BadgeUnlockQueue badges={[badge('a')]} paused t={t} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<BadgeUnlockQueue badges={[badge('a')]} t={t} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
