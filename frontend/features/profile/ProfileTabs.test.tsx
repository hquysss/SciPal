// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileTabs } from './ProfileHero';

afterEach(cleanup);

function Harness() {
  const [active, setActive] = useState<'a' | 'b'>('a');
  return <ProfileTabs label="Tabs" idPrefix="t" active={active} onChange={setActive} tabs={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} />;
}

describe('ProfileTabs', () => {
  it('keeps one tab stop and moves with the arrow keys', () => {
    render(<Harness />);
    const [a, b] = screen.getAllByRole('tab');
    expect([a.tabIndex, b.tabIndex]).toEqual([0, -1]);
    a.focus();
    fireEvent.keyDown(a, { key: 'ArrowRight' });
    expect(b.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(b);
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    expect(a.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(a, { key: 'End' });
    expect(document.activeElement).toBe(b);
  });
});
