// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import { ExamStart } from './ExamStart';

afterEach(cleanup);

const setup = () => {
  const onStart = vi.fn();
  render(<ExamStart questionCount={10} durationMinutes={45} layout={null} onStart={onStart} />);
  return onStart;
};
const press = () => fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu làm bài' }));

describe('starting an exam', () => {
  it('asks first, and says the clock starts and cannot be paused, without starting yet', () => {
    const onStart = setup();
    press();
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toMatch(/Vào thi/);
    expect(dialog.textContent).toMatch(/45 phút/);
    expect(dialog.textContent).toMatch(/không tạm dừng/);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('stays on the page before the exam when the learner backs out', async () => {
    const onStart = setup();
    press();
    fireEvent.click(screen.getByRole('button', { name: 'Chưa, quay lại' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onStart).not.toHaveBeenCalled();
  });

  it('starts only once the learner confirms', async () => {
    const onStart = setup();
    press();
    fireEvent.click(screen.getByRole('button', { name: 'Vào thi' }));
    await waitFor(() => expect(onStart).toHaveBeenCalledTimes(1));
  });
});
