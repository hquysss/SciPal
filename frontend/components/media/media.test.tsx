import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Media, mediaKind } from './Media';

describe('mediaKind', () => {
  it('reads the kind from the stored name, ignoring a query or hash', () => {
    expect(mediaKind('https://m.test/u/a.webm')).toBe('video');
    expect(mediaKind('https://m.test/u/a.JSON?v=2')).toBe('lottie');
    for (const name of ['a.png', 'a.jpg', 'a.webp', 'a.svg', 'noext']) expect(mediaKind(`https://m.test/u/${name}`)).toBe('image');
  });
});

describe('Media', () => {
  it('draws a picture or SVG as an image, and a WebM as a muted looping video', () => {
    expect(renderToStaticMarkup(<Media url="https://m.test/a.svg" alt="Sóng" className="x" />)).toMatch(/^<img [^>]*src="https:\/\/m\.test\/a\.svg"[^>]*alt="Sóng"/);
    const video = renderToStaticMarkup(<Media url="https://m.test/a.webm" alt="Clip" />);
    expect(video).toContain('<video');
    expect(video).toMatch(/muted/);
    expect(video).toMatch(/loop/);
    expect(video).toMatch(/autoPlay|autoplay/i);
    expect(video).toContain('aria-label="Clip"');
  });

  it('gives a Lottie a labelled box the player fills in the browser', () => {
    expect(renderToStaticMarkup(<Media url="https://m.test/a.json" alt="Con lắc" />)).toMatch(/role="img"[^>]*aria-label="Con lắc"|aria-label="Con lắc"[^>]*role="img"/);
  });
});
