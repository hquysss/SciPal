// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ t: (copy: { vi: string }) => copy.vi }) }));

import { AccountHelpModal } from './AccountHelpModal';

afterEach(cleanup);

function AccountHelpHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open help</button>
      <AccountHelpModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

describe('AccountHelpModal keyboard behavior', () => {
  it('keeps Tab and Shift+Tab inside the open dialog', async () => {
    render(<AccountHelpHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open help' }));
    await screen.findByRole('dialog', { name: 'Hỗ trợ tài khoản' });

    const close = screen.getByRole('button', { name: 'Đóng' });
    const understood = screen.getByRole('button', { name: 'Đã hiểu' });
    await waitFor(() => expect(document.activeElement).toBe(close));

    understood.focus();
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);

    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(backward);
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(understood);
  });

  it('closes on Escape', async () => {
    render(<AccountHelpHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open help' }));
    await screen.findByRole('dialog', { name: 'Hỗ trợ tài khoản' });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('returns focus to the opener when a dialog button closes it', async () => {
    render(<AccountHelpHarness />);
    const opener = screen.getByRole('button', { name: 'Open help' });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole('dialog', { name: 'Hỗ trợ tài khoản' });

    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it('keeps backdrop click dismissal available', async () => {
    render(<AccountHelpHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open help' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hỗ trợ tài khoản' });
    const backdrop = document.querySelector('.fixed.inset-0');
    if (!backdrop) throw new Error('Dialog backdrop is missing');

    fireEvent.click(backdrop);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
