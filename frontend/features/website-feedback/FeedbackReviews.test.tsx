import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeedbackReviews } from './FeedbackReviews';
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (v: { vi: string; en: string }) => v.vi }) }));
const data = { total: 21, average: 4.24, distribution: [1, 1, 2, 5, 12], page: 2, page_size: 10 as const, reviews: [{ id: '00000000-0000-4000-8000-000000000031', rating: 5, usability: 'easy' as const, feedback: '<script>alert(1)</script>', created_at: '2026-10-06T00:00:00Z', sender: { id: '00000000-0000-4000-8000-000000000032', name: 'Private Account' } }] };
it('uses the aggregate average rather than averaging displayed reviews', () => {
  const html = renderToStaticMarkup(<FeedbackReviews data={data} onPage={() => {}} />);
  expect(html).toContain('4,2'); expect(html).toContain('21 đánh giá đã lưu'); expect(html).toContain('Trang 2 / 3');
});
it('hides identity on the public table even if parent data includes it', () => {
  const html = renderToStaticMarkup(<FeedbackReviews data={data} onPage={() => {}} />);
  expect(html).toContain('Ẩn danh'); expect(html).not.toContain('Private Account'); expect(html).not.toContain(data.reviews[0]!.sender.id);
  expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;');
});
it('shows identity only in the admin table', () => {
  const html = renderToStaticMarkup(<FeedbackReviews data={data} identities onPage={() => {}} />); expect(html).toContain('Private Account'); expect(html).toContain(data.reviews[0]!.sender.id);
});
it('has no invented average when no reviews exist', () => {
  const html = renderToStaticMarkup(<FeedbackReviews data={{ ...data, total: 0, average: null, distribution: [0,0,0,0,0], reviews: [] }} onPage={() => {}} />);
  expect(html).toContain('Chưa có đánh giá'); expect(html).not.toContain('4,2');
});
