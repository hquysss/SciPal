import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PrivacyPage from './page';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

describe('/privacy', () => {
  const html = renderToStaticMarkup(<PrivacyPage />);

  it('names what SciPal keeps and who processes it', () => {
    expect(html).toContain('Chính sách quyền riêng tư');
    for (const name of ['Supabase', 'Vercel', 'payOS', 'Google Gemini', 'OpenAI']) expect(html).toContain(name);
    // Sign-in with Facebook was removed; the policy must not claim it.
    expect(html).not.toContain('Facebook');
  });

  it('tells people how to have their data deleted', () => {
    expect(html).toContain('id="xoa-du-lieu"');
    expect(html).toContain('href="mailto:tuilangus@gmail.com');
  });
});
