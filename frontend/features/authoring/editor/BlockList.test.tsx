import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Block } from '@scipal/types';
import { countRawColors } from '../../../lib/theme/rawColors';
import { BlockList } from './BlockList';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const blocks: Block[] = [
  { type: 'theory', content: { vi: 'Một', en: '' } },
  { type: 'theory', content: { vi: 'Hai', en: '' } },
];

describe('BlockList', () => {
  it('offers an insert control before, between and after blocks, plus move, duplicate and delete', () => {
    const html = renderToStaticMarkup(<BlockList part="lesson" blocks={blocks} onChange={() => {}} subjectId="s" readOnly={false} />);
    expect(html.match(/aria-label="Chèn khối tại đây"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Lên trên"');
    expect(html).toContain('aria-label="Xuống dưới"');
    expect(html).toContain('aria-label="Nhân đôi"');
    expect(html).toContain('aria-label="Xóa khối"');
    expect(html).toContain('Lý thuyết');
  });

  it('drags blocks only by their handle, so selecting text in an editor never moves a block', () => {
    const html = renderToStaticMarkup(<BlockList part="lesson" blocks={blocks} onChange={() => {}} subjectId="s" readOnly={false} focusIndex={0} />);
    expect(html.match(/draggable="true"/g)).toHaveLength(2);
    expect(html).toMatch(/<span[^>]*draggable="true"[^>]*title="Kéo để sắp xếp"/);
    expect(html).not.toMatch(/<li[^>]*draggable="true"/);
    expect(countRawColors(html).total).toBe(0);
  });

  it('opens the focused block for editing', () => {
    const html = renderToStaticMarkup(<BlockList part="lesson" blocks={blocks} onChange={() => {}} subjectId="s" readOnly={false} focusIndex={1} />);
    expect(html).toContain('>Hai</textarea>');
    expect(html).not.toContain('>Một</textarea>');
  });

  it('is read-only while the lesson waits for review', () => {
    const html = renderToStaticMarkup(<BlockList part="lesson" blocks={blocks} onChange={() => {}} subjectId="s" readOnly />);
    expect(html).not.toContain('Chèn khối tại đây');
    expect(html).not.toContain('draggable="true"');
    expect(html).not.toContain('Xóa khối');
  });

  it('lets teachers insert simulations in the simulation tab', () => {
    const html = renderToStaticMarkup(<BlockList part="simulation" blocks={[]} onChange={() => {}} subjectId="s" readOnly={false} />);
    expect(html.match(/aria-label="Chèn khối tại đây"/g)).toHaveLength(1);
    expect(html).toContain('Chưa có mô phỏng');
    expect(html).not.toContain('bước tiếp theo');
  });

  it('explains empty parts', () => {
    expect(renderToStaticMarkup(<BlockList part="lesson" blocks={[]} onChange={() => {}} subjectId="s" readOnly={false} />)).toContain('Bài chưa có nội dung');
  });
});
