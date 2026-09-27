import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { AdminRequestCard, CompleteForm, completionProblem } from './AdminQueue';
import type { SimulationRequest } from './api';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const request: SimulationRequest = {
  id: 'r1',
  lesson_id: 'l1',
  description: 'Khúc xạ ánh sáng',
  reference_url: 'https://phet.colorado.edu/en/simulations/bending-light',
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

const noop = async () => {};

describe('AdminRequestCard', () => {
  it('offers accept, decline and complete for an open request, with lesson and subject', () => {
    const html = renderToStaticMarkup(<AdminRequestCard request={request} onChanged={noop} />);
    expect(html).toContain('Khúc xạ');
    expect(html).toContain('Vật lý');
    expect(html).toContain('Nhận làm');
    expect(html).toContain('Từ chối');
    expect(html).toContain('Hoàn thành');
    expect(countRawColors(html).total).toBe(0);
  });

  it('offers no actions once a request is done or declined', () => {
    for (const status of ['done', 'declined'] as const) {
      const html = renderToStaticMarkup(<AdminRequestCard request={{ ...request, status }} onChanged={noop} />);
      expect(html).not.toContain('Nhận làm');
      expect(html).not.toContain('Hoàn thành</button>');
    }
    expect(renderToStaticMarkup(<AdminRequestCard request={{ ...request, status: 'in_progress' }} onChanged={noop} />)).not.toContain('Nhận làm');
  });
});

describe('completing a request', () => {
  it('checks the result with the same rules as the Studio', () => {
    expect(completionProblem({ type: 'interactive', kind: 'embed', heading: { vi: 'A', en: 'A' }, offline: false, embed_url: 'https://evil.example/x', config: {} })).toBeTruthy();
    expect(completionProblem({ type: 'interactive', kind: 'motion', heading: { vi: '', en: '' }, offline: true, config: {} })?.vi).toMatch(/tiêu đề/);
    expect(completionProblem({ type: 'interactive', kind: 'motion', heading: { vi: 'Ném', en: 'Throw' }, offline: true, config: {} })).toBeNull();
  });

  it('shows the template settings and a preview of what the teacher will insert', () => {
    const html = renderToStaticMarkup(<CompleteForm request={request} onDone={noop} onCancel={() => {}} />);
    expect(html).toContain('Mẫu mô phỏng');
    expect(html).toContain('Xem trước');
    expect(html).toContain('<select');
  });
});
