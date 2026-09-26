import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { TutorSection } from './TutorSection';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'vi', t: (o: { en: string; vi: string }) => o.vi }),
}));

describe('TutorSection', () => {
  it('shows the heading and the chat demo', () => {
    const html = renderToStaticMarkup(<TutorSection />);
    expect(html).toMatch(/<h2[^>]*>Hỏi bất cứ lúc nào<\/h2>/);
    expect(html).toContain('Gia sư AI');
    expect(html).toContain('data-playing=');
  });

  it('hides the try button without href', () => {
    expect(renderToStaticMarkup(<TutorSection />)).not.toContain('Thử ngay');
  });

  it('links the try button when href is given', () => {
    expect(renderToStaticMarkup(<TutorSection href="/tutor" />)).toMatch(/<a[^>]*href="\/tutor"[^>]*>[\s\S]*Thử ngay/);
  });

  it('keeps the demo short: no inquiry diagram block', () => {
    const html = renderToStaticMarkup(<TutorSection />);
    expect(html).not.toContain('So sánh độ cao Mặt Trời');
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(renderToStaticMarkup(<TutorSection href="/tutor" />)).total).toBe(0);
  });
});
