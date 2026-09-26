import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { BilingualCard, HowItWorks, TermCard } from './HowItWorks';

let lang: 'en' | 'vi' = 'vi';
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang, t: (o: { en: string; vi: string }) => o[lang] }),
}));

const pressed = (label: string) =>
  new RegExp(`aria-label="${label}"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="${label}"`);

describe('HowItWorks', () => {
  it('shows three cards with short labels', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<HowItWorks />);
    expect(html).toContain('id="cach-hoc"');
    expect(html).toContain('aria-labelledby="how-title"');
    for (const label of ['Hỏi', 'Song ngữ', 'Tra thuật ngữ', 'Vì sao bóng ngắn lại?']) expect(html).toContain(label);
  });

  it('bilingual card starts in Vietnamese with VI pressed', () => {
    const html = renderToStaticMarkup(<BilingualCard />);
    expect(html).toContain('lang="vi"');
    expect(html).toContain('Khi Mặt Trời lên cao, bóng ngắn lại.');
    expect(html).toMatch(pressed('Tiếng Việt'));
    expect(html).toContain('src="/flags/vn.svg"');
  });

  it('bilingual card can start in English', () => {
    const html = renderToStaticMarkup(<BilingualCard initial="en" />);
    expect(html).toContain('lang="en"');
    expect(html).toContain('As the Sun rises, shadows grow shorter.');
    expect(html).toMatch(pressed('English'));
  });

  it('term card shows the term, then the definition when flipped', () => {
    lang = 'vi';
    const front = renderToStaticMarkup(<TermCard />);
    expect(front).toContain('aria-expanded="false"');
    expect(front).toContain('Quang hợp');
    expect(front).toContain('href="/glossary"');
    expect(front).toContain('Mở từ điển');
    const back = renderToStaticMarkup(<TermCard initialFlipped />);
    expect(back).toContain('aria-expanded="true"');
    expect(back).toContain('Cây dùng ánh sáng để tạo chất dinh dưỡng.');
  });

  it('switches labels to English', () => {
    lang = 'en';
    const html = renderToStaticMarkup(<HowItWorks />);
    for (const label of ['Ask', 'Bilingual', 'Look up terms', 'Why do shadows shrink?', 'Photosynthesis', 'Open glossary']) {
      expect(html).toContain(label);
    }
    lang = 'vi';
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(renderToStaticMarkup(<HowItWorks />)).total).toBe(0);
  });
});
