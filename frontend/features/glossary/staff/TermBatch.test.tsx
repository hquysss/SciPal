import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (c: { vi: string }) => c.vi }) }));
vi.mock('./api', () => ({ createTerms: vi.fn() }));

import { TermBatch } from './TermBatch';

describe('TermBatch', () => {
  it('opens with an empty table instead of crashing', () => {
    const html = renderToStaticMarkup(<TermBatch subjects={[{ id: 's', name_en: 'Informatics', name_vi: 'Tin học' }]} isAdmin onSaved={() => {}} />);
    expect(html).toContain('Tin học');
    expect(html.match(/<tr/g)).toHaveLength(4); // header + 3 empty rows
    expect(html).toContain('Thêm 0 thuật ngữ');
  });
});
