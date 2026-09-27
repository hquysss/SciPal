import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LessonStatusBadge } from './lessonStatusBadge';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ t: (o: { en: string; vi: string }) => `${o.vi} / ${o.en}`, lang: 'vi' }),
}));

describe('LessonStatusBadge', () => {
  it.each([
    ['draft', 'bg-surface-sunken', 'Bản nháp / Draft'],
    ['pending_review', 'bg-warning-surface', 'Chờ admin duyệt / Awaiting review'],
    ['published', 'bg-success-surface', 'Đã xuất bản / Published'],
    ['rejected', 'bg-danger-surface', 'Cần chỉnh sửa / Changes requested'],
  ])('%s uses its variant and bilingual label', (status, variantClass, label) => {
    const html = renderToStaticMarkup(<LessonStatusBadge status={status} />);
    expect(html).toContain(variantClass);
    expect(html).toContain(label);
  });

  it('falls back to a secondary badge showing the raw status', () => {
    const html = renderToStaticMarkup(<LessonStatusBadge status="archived" />);
    expect(html).toContain('bg-surface-sunken');
    expect(html).toContain('archived');
  });
});
