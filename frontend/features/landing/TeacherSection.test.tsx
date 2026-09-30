import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (c: { vi: string }) => c.vi }) }));

import { TeacherSection } from './TeacherSection';

describe('TeacherSection', () => {
  it('lists what teachers get and sends them to sign up, then to the Profile', () => {
    const html = renderToStaticMarkup(<TeacherSection />);
    expect(html).toContain('Dành cho giáo viên');
    expect(html.match(/<li/g)).toHaveLength(4);
    expect(html).toContain('href="/login?mode=signup&amp;redirect=%2Fprofile"');
    expect(html).toContain('href="/pricing"');
  });
});
