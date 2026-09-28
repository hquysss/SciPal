import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { TutorChatView } from './TutorChat';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

const base = { messages: [], streaming: false, remaining: 12, error: null, limitReached: false, level: 'upper_secondary' as const, onSend: () => {}, onStop: () => {}, onRetry: () => {} };

describe('TutorChatView', () => {
  it('shows example questions and the remaining count when empty', () => {
    const html = renderToStaticMarkup(<TutorChatView {...base} />);
    expect(html.match(/data-example/g)).toHaveLength(4);
    expect(html).toContain('Còn 12 lượt hôm nay');
    expect(html).toMatch(/<label[^>]*>Câu hỏi của em<\/label>/);
    expect(countRawColors(html).total).toBe(0);
  });

  it('shows "Dừng" while streaming', () => {
    const html = renderToStaticMarkup(<TutorChatView {...base} streaming messages={[{ role: 'user', content: 'Hỏi' }, { role: 'assistant', content: 'Gợi' }]} />);
    expect(html).toContain('Dừng');
    expect(html).not.toContain('data-example');
  });

  it('shows the error with "Thử lại", and disables the composer at the limit', () => {
    const err = renderToStaticMarkup(<TutorChatView {...base} error={{ vi: 'Gia sư đang bận.', en: 'Busy' }} messages={[{ role: 'user', content: 'Hỏi' }]} />);
    expect(err).toContain('Gia sư đang bận.');
    expect(err).toContain('Thử lại');
    const limit = renderToStaticMarkup(<TutorChatView {...base} limitReached remaining={0} error={{ vi: 'Hết lượt', en: 'Limit' }} />);
    expect(limit).toMatch(/<textarea[^>]*disabled=""/);
    expect(limit).not.toContain('Thử lại');
  });
});
