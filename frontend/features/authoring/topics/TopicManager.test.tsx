import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { TopicManager } from './TopicManager';
import type { ManagedTopic } from './api';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const subjects = [{ id: 's1', slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', sort_order: 1, grades: [10, 11] }];
const topic = (id: string, lesson_count: number): ManagedTopic => ({
  id, subject_id: 's1', slug: `g10-${id}`, grade: 10, name_en: `Topic ${id}`, name_vi: `Chủ đề ${id}`, sort_order: 0, lesson_count,
});

/** Whether the button with this aria-label is disabled. */
const disabled = (html: string, label: string) => {
  const tag = html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0];
  if (!tag) throw new Error(`No button "${label}"`);
  return tag.includes('disabled=""');
};

describe('TopicManager', () => {
  it('lists topics with lesson counts and deletes only empty ones', () => {
    const html = renderToStaticMarkup(<TopicManager subjects={subjects} initialTopics={[topic('a', 3), topic('b', 0)]} />);
    expect(html).toContain('Chủ đề a');
    expect(html).toContain('3 bài');
    expect(disabled(html, 'Xóa chủ đề Chủ đề a')).toBe(true);
    expect(disabled(html, 'Xóa chủ đề Chủ đề b')).toBe(false);
    expect(disabled(html, 'Đưa Chủ đề a lên')).toBe(true);
    expect(disabled(html, 'Đưa Chủ đề b xuống')).toBe(true);
    expect(html).toMatch(/<label[^>]*>Môn học<\/label>/);
    expect(html).toContain('Thêm chủ đề');
    expect(countRawColors(html).total).toBe(0);
  });

  it('says when a grade has no topics yet', () => {
    expect(renderToStaticMarkup(<TopicManager subjects={subjects} initialTopics={[]} />)).toContain('Lớp này chưa có chủ đề nào.');
  });
});
