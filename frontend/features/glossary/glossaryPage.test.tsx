import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import GlossaryPage, { dynamic } from '@/app/glossary/page';
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('./termQueries', () => ({ getAllTerms: read }));
vi.mock('next/link', () => ({ default: (props: ComponentProps<'a'>) => <a {...props} /> }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ t: (text: { vi: string }) => text.vi }) }));
vi.mock('./GlossaryHeader', () => ({ GlossaryHeader: () => <h1>Từ điển thuật ngữ</h1> }));
vi.mock('./GlossarySearch', () => ({ GlossarySearch: () => <div>Live term search</div> }));
beforeEach(() => { read.mockReset(); });
it('keeps the route dynamic so imports are read on the next page request', () => {
  expect(dynamic).toBe('force-dynamic');
});
it('shows a retry notice when the real term query fails', async () => {
  read.mockRejectedValue(new Error('Database unavailable'));
  const page = await GlossaryPage();
  const html = renderToStaticMarkup(page);
  expect(html).toContain('Không tải được thuật ngữ');
  expect(html).toContain('href="/glossary"');
  expect(html).not.toContain('Live term search');
  expect(html).not.toContain('Database unavailable');
});
