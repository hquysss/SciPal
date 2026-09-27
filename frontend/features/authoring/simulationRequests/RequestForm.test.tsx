import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { RequestForm } from './RequestForm';
import { LessonRequestsPanel } from './LessonRequestsPanel';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

describe('RequestForm', () => {
  it('asks what the simulation should do, an optional https link and a sketch', () => {
    const html = renderToStaticMarkup(<RequestForm lessonId="l1" onSent={() => {}} onCancel={() => {}} />);
    expect(html).toContain('Mô phỏng cần làm gì');
    expect(html).toContain('0/1000');
    expect(html).toContain('type="url"');
    expect(html).toContain('Ảnh phác thảo');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('LessonRequestsPanel', () => {
  it('offers the request form when no template fits', () => {
    const html = renderToStaticMarkup(<LessonRequestsPanel lessonId="l1" onInsert={() => {}} />);
    expect(html).toContain('Không có mẫu phù hợp?');
    expect(html).toContain('Gửi đề xuất mô phỏng');
  });
});
