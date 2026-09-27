import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Block } from '@scipal/types';
import { countRawColors } from '../../../lib/theme/rawColors';
import { BlockEditor } from './BlockEditor';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const render = (block: Block, lang: 'vi' | 'en' = 'vi') =>
  renderToStaticMarkup(<BlockEditor block={block} onChange={() => {}} subjectId="s" lang={lang} onLangChange={() => {}} />);

describe('BlockEditor', () => {
  it('edits theory in the chosen language with a toolbar', () => {
    const html = render({ type: 'theory', content: { vi: 'Xin chào', en: 'Hello' } }, 'en');
    expect(html).toContain('Hello');
    expect(html).not.toContain('Xin chào');
    expect(html).toContain('aria-label="Đậm"');
    expect(countRawColors(html).total).toBe(0);
  });

  it('marks the English tab when English is missing', () => {
    const html = render({ type: 'theory', content: { vi: 'Xin chào', en: '' } });
    expect(html).toContain('Chưa có tiếng Anh');
  });

  it('shows each code tab', () => {
    const html = render({ type: 'code', tabs: [{ lang: 'python', code: 'print(1)' }, { lang: 'cpp', code: 'int x;' }] });
    expect(html).toContain('print(1)');
    expect(html).toContain('C++');
    expect(countRawColors(html).total).toBe(0);
  });

  it('previews a formula and explains a broken one', () => {
    expect(render({ type: 'formula', katex: 'a^2', caption: { vi: 'Bình phương', en: '' } })).toContain('katex');
    expect(render({ type: 'formula', katex: '\frac{', caption: { vi: '', en: '' } })).toContain('Công thức sai cú pháp');
  });

  it('asks for the image description', () => {
    const html = render({ type: 'image', url: 'https://u/a.png', alt: { vi: '', en: '' } });
    expect(html).toContain('Mô tả ảnh');
    expect(html).toContain('src="https://u/a.png"');
    expect(countRawColors(html).total).toBe(0);
  });

  it('searches terms by name instead of asking for an id', () => {
    const html = render({ type: 'term-ref', term_id: '0b6f9c1a-7d2e-4f3a-8c5b-1e2d3c4b5a69' });
    expect(html).toContain('Đổi');
    expect(html).not.toContain('0b6f9c1a');
  });

  it('opens the practice question behind a quiz block (none outside the lesson editor)', () => {
    const html = render({ type: 'quiz', question_id: '11111111-1111-4111-8111-111111111111' });
    expect(html).not.toContain('bước tiếp theo');
    expect(html).toContain('Không mở được trình soạn câu hỏi');
  });
});
