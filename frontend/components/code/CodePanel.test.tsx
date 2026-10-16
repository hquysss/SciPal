import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { contrastRatio, mixHex, THEME_LEVELS, THEME_MODES, THEME_PALETTES } from '@scipal/ui';
import { CodePanel } from './CodePanel';

const tabs = [
  { lang: 'python' as const, code: 'for i in range(3):\n    print(i)' },
  { lang: 'cpp' as const, code: 'for (int i = 0; i < 3; i++)' },
];

describe('CodePanel', () => {
  it('marks only the running line with aria-current', () => {
    const html = renderToStaticMarkup(<CodePanel tabs={tabs} activeLine={2} lang="vi" />);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="step"[^>]*>[\s\S]*?print/);
  });

  it('marks no line when nothing is running', () => {
    const html = renderToStaticMarkup(<CodePanel tabs={tabs} lang="en" />);
    expect(html).not.toContain('aria-current');
  });

  it('lists every tab with its label and selects the first', () => {
    const html = renderToStaticMarkup(<CodePanel tabs={tabs} lang="en" />);
    expect(html).toContain('Python');
    expect(html).toContain('C++');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  });

  it('shows the copy button with a Vietnamese label only when asked', () => {
    expect(renderToStaticMarkup(<CodePanel tabs={tabs} lang="vi" copy />)).toContain('Chép mã');
    expect(renderToStaticMarkup(<CodePanel tabs={tabs} lang="vi" />)).not.toContain('Chép mã');
  });

  it('puts the extra chip on the running line only', () => {
    const html = renderToStaticMarkup(<CodePanel tabs={tabs} activeLine={1} lang="vi" lineExtra={<b>chip</b>} />);
    expect(html.match(/<b>chip<\/b>/g)).toHaveLength(1);
  });
});

// The recipe of CodePanel.module.css: base/fg per mode, then each syntax colour mixed with fg.
describe('syntax colours', () => {
  it.each(THEME_LEVELS.flatMap((level) => THEME_MODES.map((mode) => [level, mode] as const)))('read at 4.5:1 on %s / %s', (level, mode) => {
    const p = THEME_PALETTES[level][mode];
    const [base, fg] = mode === 'dark' ? [mixHex(p.surfaceSunken, p.surface, 0.55), p.ink] : [mixHex(p.ink, p.surface, 0.88), p.paper];
    const colours: Record<string, string> = {
      keyword: mixHex(p.coral, fg, 0.55),
      function: mixHex(p.action, fg, 0.4),
      string: mixHex('#16a34a', fg, 0.45),
      number: mixHex(p.sun, fg, 0.7),
      operator: mixHex(fg, base, 0.85),
      comment: mixHex(fg, base, 0.72),
      'lit 1': mixHex('#16a34a', fg, 0.62),
      'lit 2': mixHex(p.sun, fg, 0.82),
      'lit 3': mixHex(p.coral, fg, 0.68),
    };
    const low = Object.entries(colours).filter(([, c]) => contrastRatio(c, base) < 4.5).map(([k, c]) => `${k} ${c} on ${base}: ${contrastRatio(c, base).toFixed(2)}`);
    expect(low).toEqual([]);
  });
});
