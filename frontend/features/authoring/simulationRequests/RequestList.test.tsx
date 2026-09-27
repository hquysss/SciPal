import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { RequestList } from './RequestList';
import type { SimulationRequest } from './api';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const base: SimulationRequest = {
  id: 'r1',
  lesson_id: 'l1',
  description: 'Mô phỏng khúc xạ',
  reference_url: null,
  sketch_url: null,
  status: 'open',
  admin_note: null,
  result_block: null,
  created_at: '2026-09-27T00:00:00Z',
  updated_at: '2026-09-27T00:00:00Z',
  lesson_title_vi: 'Khúc xạ',
  lesson_title_en: 'Refraction',
  subject_slug: 'physics',
  subject_name_vi: 'Vật lý',
  subject_name_en: 'Physics',
};
const result = { type: 'interactive' as const, kind: 'embed' as const, heading: { vi: 'Khúc xạ', en: 'Refraction' }, offline: false, embed_url: 'https://phet.colorado.edu/sims/html/x/latest/x_all.html', config: {} };

describe('RequestList', () => {
  it('shows each status with the admin note, withdraw for open ones and insert for done ones', () => {
    const html = renderToStaticMarkup(
      <RequestList
        requests={[
          base,
          { ...base, id: 'r2', status: 'declined', admin_note: 'Đã có mẫu Chuyển động' },
          { ...base, id: 'r3', status: 'done', result_block: result },
        ]}
        onWithdraw={() => {}}
        onInsert={() => {}}
      />,
    );
    expect(html).toContain('Đã gửi');
    expect(html).toContain('Từ chối');
    expect(html).toContain('Đã xong');
    expect(html).toContain('Đã có mẫu Chuyển động');
    expect(html.match(/Rút lại/g)).toHaveLength(1);
    expect(html.match(/Chèn vào bài/g)).toHaveLength(1);
    expect(countRawColors(html).total).toBe(0);
  });

  it('links to the lesson instead of inserting on the teacher-wide page', () => {
    const html = renderToStaticMarkup(<RequestList requests={[{ ...base, status: 'done', result_block: result }]} onWithdraw={() => {}} showLesson />);
    expect(html).not.toContain('Chèn vào bài');
    expect(html).toContain('href="/teacher/lessons/l1"');
    expect(html).toContain('Khúc xạ');
  });

  it('says when there is nothing yet', () => {
    expect(renderToStaticMarkup(<RequestList requests={[]} onWithdraw={() => {}} />)).toContain('Chưa có đề xuất');
  });
});
