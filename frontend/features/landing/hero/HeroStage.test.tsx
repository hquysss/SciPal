import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { HeroStage } from './HeroStage';

vi.mock('next/dynamic', () => ({ default: () => () => null }));

describe('HeroStage', () => {
  it('server-renders the SVG fallback in a fixed box, hidden from assistive tech', () => {
    const html = renderToStaticMarkup(<HeroStage level="upper_secondary" />);
    expect(html).toContain('<svg');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<canvas');
    expect(html).toContain('data-hero-state="fallback"');
    expect(countRawColors(html).total).toBe(0);
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('draws the level objects in the fallback', () => {
    expect(renderToStaticMarkup(<HeroStage level="upper_secondary" />)).toContain('data-level-objects="flask magnifier keyboard"');
    expect(renderToStaticMarkup(<HeroStage level="primary" />)).toContain('data-level-objects="pencil ruler chalk-box"');
    expect(renderToStaticMarkup(<HeroStage level="lower_secondary" />)).toContain(
      'data-level-objects="compass set-square calculator"',
    );
  });
});
