// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { AutoTermsSwitch } from './AutoTermsSwitch';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
afterEach(cleanup);

describe('AutoTermsSwitch', () => {
  it('is a labelled checkbox that reports the new value', () => {
    const onChange = vi.fn();
    const { container } = render(<AutoTermsSwitch checked onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: /Tự đánh dấu thuật ngữ/ }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(false);
    expect(countRawColors(container.innerHTML).total).toBe(0);
  });

  it('can be switched on again, and is locked when the lesson cannot be edited', () => {
    const onChange = vi.fn();
    const { rerender } = render(<AutoTermsSwitch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<AutoTermsSwitch checked={false} onChange={onChange} disabled />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });
});
