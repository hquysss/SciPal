import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { AiTutorPanel } from './AiTutorPanel';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const L = 'b0000000-0000-4000-8000-000000000001';

describe('AiTutorPanel', () => {
  it('names the lesson and links to the tutor page', () => {
    const html = renderToStaticMarkup(<AiTutorPanel lessonId={L} lessonTitle={{ vi: "Vòng lặp", en: "Loops" }} level="upper_secondary" signedIn onClose={() => {}} />);
    expect(html).toContain('Vòng lặp');
    expect(html).toContain(`href="/tutor?lesson=${L}"`);
    expect(html).toContain('Mở ở trang Gia sư');
    expect(html).toContain('Câu hỏi của em</label>');
    expect(countRawColors(html).total).toBe(0);
  });

  it('asks a signed-out visitor to sign in instead of showing the chat', () => {
    const html = renderToStaticMarkup(<AiTutorPanel lessonId={L} lessonTitle={{ vi: "Vòng lặp", en: "Loops" }} level="upper_secondary" signedIn={false} onClose={() => {}} />);
    expect(html).toContain(`href="/login?redirect=${encodeURIComponent(`/tutor?lesson=${L}`)}"`);
    expect(html).not.toContain('Câu hỏi của em</label>');
  });
});
