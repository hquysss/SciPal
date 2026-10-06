// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WebsiteFeedbackForm } from './WebsiteFeedbackForm';
const submit = vi.hoisted(() => vi.fn());
vi.mock('./api', () => ({ submitWebsiteFeedback: submit }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (v: { vi: string; en: string }) => v.vi }) }));
afterEach(() => { cleanup(); submit.mockReset(); });
function fill() { fireEvent.click(screen.getByRole('radio', { name: '4 trên 5 sao' })); fireEvent.click(screen.getByRole('radio', { name: 'Dễ dùng' })); }
it('saves a guest review and only shows thanks after storage confirms', async () => {
  let finish: (() => void) | undefined;
  submit.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  const saved = vi.fn(); render(<WebsiteFeedbackForm onSaved={saved} />);
  expect(screen.getByRole('button', { name: 'Gửi đánh giá' }).hasAttribute('disabled')).toBe(true);
  fill(); fireEvent.change(screen.getByLabelText('Bạn muốn SciPal cải thiện điều gì?'), { target: { value: 'Tìm bài nhanh hơn' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));
  expect(screen.queryByText('Cảm ơn bạn đã góp ý!')).toBeNull(); expect(saved).not.toHaveBeenCalled();
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1)); finish?.();
  await screen.findByText('Cảm ơn bạn đã góp ý!'); expect(saved).toHaveBeenCalledTimes(1);
  expect(submit.mock.calls[0]?.[0]).toMatchObject({ rating: 4, usability: 'easy', feedback: 'Tìm bài nhanh hơn' });
});
it('keeps answers after a failed save and reuses the id for retry', async () => {
  submit.mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce(undefined);
  render(<WebsiteFeedbackForm />); fill(); fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));
  await screen.findByRole('alert'); expect(screen.queryByText('Cảm ơn bạn đã góp ý!')).toBeNull();
  expect((screen.getByRole('radio', { name: '4 trên 5 sao' }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' })); await screen.findByText('Cảm ơn bạn đã góp ý!');
  expect(submit.mock.calls[1]?.[0].submission_id).toBe(submit.mock.calls[0]?.[0].submission_id);
});
