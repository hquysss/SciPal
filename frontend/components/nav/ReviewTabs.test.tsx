import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReviewTabs } from './ReviewTabs';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'en', t: (o: { en: string }) => o.en }) }));

describe('ReviewTabs', () => {
  it('names the review queue tabs in the reader’s language and marks the current one', () => {
    const html = renderToStaticMarkup(<ReviewTabs active="exams" />);
    expect(html).toContain('aria-label="Review queue"');
    expect(html).toContain('href="/admin/lessons/review"');
    expect(html).toContain('href="/admin/lessons/review?tab=exams"');
    expect(html).toMatch(/aria-current="page"[^>]*>Exams</);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
});
