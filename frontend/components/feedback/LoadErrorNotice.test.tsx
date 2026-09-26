import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { LoadErrorNotice } from './LoadErrorNotice';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ t: (o: { en: string; vi: string }) => o.vi, lang: 'vi' }),
}));

describe('LoadErrorNotice', () => {
  it('announces the error and offers a retry link with a 44px target', () => {
    const html = renderToStaticMarkup(
      <LoadErrorNotice message={{ en: 'Could not load this lesson.', vi: 'Chưa tải được bài học.' }} retryHref="/informatics/bai-3" />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Chưa tải được bài học.');
    expect(html).toContain('href="/informatics/bai-3"');
    expect(html).toContain('Thử lại');
    expect(html).toContain('min-h-11');
    expect(countRawColors(html).total).toBe(0);
  });

  it('puts the retry link on its own line below the message', () => {
    const html = renderToStaticMarkup(
      <LoadErrorNotice message={{ en: 'Could not load this lesson.', vi: 'Chưa tải được bài học.' }} retryHref="/informatics/bai-3" />,
    );
    expect(html).toMatch(/<p[^>]*>Chưa tải được bài học\.<\/p>/);
    const linkClasses = html.match(/<a[^>]*class="([^"]*)"/)?.[1].split(/\s+/) ?? [];
    expect(linkClasses.filter((c) => c === 'flex' || c === 'inline-flex')).toHaveLength(1);
  });

  it('omits the link without a retry target', () => {
    const html = renderToStaticMarkup(<LoadErrorNotice message={{ en: 'x', vi: 'Lỗi' }} />);
    expect(html).not.toContain('<a');
  });
});
