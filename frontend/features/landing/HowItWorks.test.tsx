import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { BilingualCard, HowItWorks, SearchDemo, TermCard } from './HowItWorks';

let lang: 'en' | 'vi' = 'vi';
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang, t: (o: { en: string; vi: string }) => o[lang] }),
}));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));

const pressed = (label: string) =>
  new RegExp(`aria-label="${label}"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="${label}"`);

describe('HowItWorks', () => {
  it('shows three demo cards with plain headings', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<HowItWorks level="upper_secondary" />);
    expect(html).toContain('id="cach-hoc"');
    expect(html).toContain('aria-labelledby="how-title"');
    for (const label of ['Hiểu từng bước', 'Đổi ngôn ngữ từng câu', 'Tra thuật ngữ ngay trong bài', 'Tìm số 26 trong dãy đã sắp xếp.']) {
      expect(html).toContain(label);
    }
    expect(html.match(/<h3/g)).toHaveLength(3);
  });

  it('search demo lays out the sorted list and starts unplayed', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<SearchDemo level="upper_secondary" />);
    expect(html.match(/data-state="in"/g)).toHaveLength(8);
    expect(html).toContain('Xem lại');
    expect(html).toContain('aria-live="polite"');
  });

  it('pitches the examples to the level', () => {
    lang = 'vi';
    const primary = renderToStaticMarkup(<HowItWorks level="primary" />);
    expect(primary).toContain('Bạn nghĩ một số từ 1 đến 8');
    expect(primary).toContain('Thuật toán');
    expect(primary).not.toContain('Độ phức tạp thời gian');
  });

  it('bilingual card starts in Vietnamese with VI pressed and the key term marked', () => {
    const html = renderToStaticMarkup(<BilingualCard />);
    expect(html).toContain('lang="vi"');
    expect(html).toMatch(/<mark[^>]*>tìm kiếm nhị phân<\/mark>/);
    expect(html).toMatch(pressed('Tiếng Việt'));
    expect(html).toContain('src="/flags/vn.svg"');
  });

  it('bilingual card can start in English', () => {
    const html = renderToStaticMarkup(<BilingualCard initial="en" />);
    expect(html).toContain('lang="en"');
    expect(html).toMatch(/<mark[^>]*>binary search<\/mark>/);
    expect(html).toMatch(pressed('English'));
  });

  it('term card keeps the term as the button name and reveals the definition beside it', () => {
    lang = 'vi';
    const front = renderToStaticMarkup(<TermCard />);
    expect(front).toMatch(/<button[^>]*aria-expanded="false"[^>]*>[\s\S]*?Độ phức tạp thời gian[\s\S]*?<\/button>/);
    expect(front).toMatch(/aria-controls="term-definition"/);
    expect(front).toMatch(/<div[^>]*id="term-definition"[^>]*hidden/);
    expect(front).toContain('href="/glossary"');
    expect(front).toContain('Mở từ điển');

    const back = renderToStaticMarkup(<TermCard initialFlipped />);
    expect(back).toMatch(/<button[^>]*aria-expanded="true"[^>]*>[\s\S]*?Độ phức tạp thời gian[\s\S]*?<\/button>/);
    const definition = back.match(/<div[^>]*id="term-definition"[^>]*>([\s\S]*?)<\/div>/);
    expect(definition?.[0]).not.toMatch(/hidden/);
    expect(definition?.[1]).toContain('O(log n)');
    expect(back.match(/<button[\s\S]*?<\/button>/g)?.join('')).not.toContain('O(log n)');
  });

  it('switches labels to English', () => {
    lang = 'en';
    const html = renderToStaticMarkup(<HowItWorks level="upper_secondary" />);
    for (const label of ['Understand step by step', 'Switch language by the sentence', 'Look up terms in place', 'Find 26 in a sorted list.', 'Time complexity', 'Open glossary']) {
      expect(html).toContain(label);
    }
    lang = 'vi';
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(renderToStaticMarkup(<HowItWorks />)).total).toBe(0);
  });
});
