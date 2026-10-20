import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { HeroStage } from './HeroStage';

describe('HeroStage', () => {
  it('server-renders decorative HTML cards without a canvas or raw colors', () => {
    const html = renderToStaticMarkup(<HeroStage level="upper_secondary" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<canvas');
    expect(countRawColors(html).total).toBe(0);
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('shows the level term in both languages', () => {
    const cases = [
      ['primary', 'Phân số', 'Fraction'],
      ['lower_secondary', 'Quang hợp', 'Photosynthesis'],
      ['upper_secondary', 'Thuật toán', 'Algorithm'],
    ] as const;
    for (const [level, vi, en] of cases) {
      const html = renderToStaticMarkup(<HeroStage level={level} />);
      expect(html).toContain(`data-hero-cards="${level}"`);
      expect(html).toContain(`lang="vi">${vi}<`);
      expect(html).toContain(`lang="en">${en}<`);
    }
  });

  it('marks exactly one correct answer', () => {
    const html = renderToStaticMarkup(<HeroStage level="primary" />);
    expect(html.match(/data-correct=""/g)).toHaveLength(1);
  });
});
