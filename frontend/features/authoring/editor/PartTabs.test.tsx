import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { PartTabs } from './PartTabs';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

describe('PartTabs', () => {
  it('shows the three parts with counts and a warning on the part with issues', () => {
    const html = renderToStaticMarkup(
      <PartTabs
        active="lesson"
        counts={{ lesson: 3, simulation: 0, practice: 2 }}
        issues={[{ part: 'practice', index: 0, blocking: false, message: { en: '', vi: 'x' } }]}
        onSelect={() => {}}
      />,
    );
    expect(html).toMatch(/Bài học[\s\S]*3[\s\S]*Mô phỏng[\s\S]*0[\s\S]*Tự luyện[\s\S]*2/);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/cần xem lại/g)).toHaveLength(1);
    expect(countRawColors(html).total).toBe(0);
  });
});
