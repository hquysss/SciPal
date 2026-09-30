import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
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
    expect(html).toContain('Giáo sư SciPal');
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

  it('asks an Informatics question pitched to the level', () => {
    expect(renderToStaticMarkup(<TutorSection />)).toContain('Vì sao tìm kiếm nhị phân cần dãy đã sắp xếp?');
    expect(renderToStaticMarkup(<TutorSection level="primary" />)).toContain('Vì sao máy tính cần làm theo từng bước?');
    expect(renderToStaticMarkup(<TutorSection />)).not.toContain('bóng ngắn');
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(renderToStaticMarkup(<TutorSection href="/tutor" />)).total).toBe(0);
  });
});

describe('LandingPage', () => {
  it('points the tutor section at the tutor page', () => {
    expect(readFileSync('features/landing/LandingPage.tsx', 'utf8')).toContain('<TutorSection href="/tutor"');
  });
});
