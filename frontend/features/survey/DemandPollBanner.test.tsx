import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DemandPollBanner } from './DemandPollBanner';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'vi', t: (o: { en: string; vi: string }) => o.vi }),
}));
vi.mock('./SubjectDemandModal', () => ({ SubjectDemandModal: () => null }));

describe('DemandPollBanner', () => {
  it('is one line: a question and a vote button', () => {
    const html = renderToStaticMarkup(<DemandPollBanner />);
    expect(html).toContain('Bạn quan tâm đến những môn học nào?');
    expect(html).toContain('Bình chọn môn tiếp theo');
    expect(html).not.toContain('Khảo sát người học');
    expect(html).not.toContain('Ý kiến của bạn giúp SciPal');
  });
});
