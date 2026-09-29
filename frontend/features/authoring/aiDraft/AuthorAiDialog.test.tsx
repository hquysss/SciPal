import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { AiDraftForm, AiDraftPreview } from './AuthorAiDialog';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

describe('AiDraftForm', () => {
  it('asks for a topic, a grade and an optional request, prefilled from the lesson', () => {
    const html = renderToStaticMarkup(<AiDraftForm initialTopic="Vòng lặp" busy={false} error={null} onSubmit={() => {}} />);
    expect(html).toContain('value="Vòng lặp"');
    expect(html).toContain('Lớp');
    expect(html).toContain('Yêu cầu thêm');
    expect(html).toContain('Soạn nháp');
    expect(countRawColors(html).total).toBe(0);
  });

  it('shows the refusal for a plan without AI drafts', () => {
    const html = renderToStaticMarkup(<AiDraftForm initialTopic="" busy={false} blocked error={{ vi: 'Gói hiện tại chưa có lượt AI soạn bài.', en: 'x' }} onSubmit={() => {}} />);
    expect(html).toContain('Gói hiện tại chưa có lượt AI soạn bài.');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*?Soạn nháp/s);
  });
});

describe('AiDraftPreview', () => {
  it('shows each section in both languages, the remaining count, and how to add it', () => {
    const html = renderToStaticMarkup(
      <AiDraftPreview
        blocks={[{ type: 'theory', content: { vi: '## Vòng lặp\nLặp **n** lần.', en: '## Loops\nRuns **n** times.' } }]}
        remaining={99}
        period="month"
        onApply={() => {}}
        onAgain={() => {}}
      />,
    );
    expect(html).toContain('Vòng lặp');
    expect(html).toContain('Loops');
    expect(html).toContain('Còn 99 lượt AI soạn bài tháng này');
    expect(html).toContain('Thêm vào cuối phần Bài học');
    expect(html).toContain('đọc lại');
  });

  it('names the day when AI drafts are counted per day', async () => {
    const { AiDraftPreview } = await import('./AuthorAiDialog');
    const html = renderToStaticMarkup(<AiDraftPreview blocks={[]} remaining={3} period="day" onApply={() => {}} onAgain={() => {}} />);
    expect(html).toContain('Còn 3 lượt AI soạn bài hôm nay');
  });
});
