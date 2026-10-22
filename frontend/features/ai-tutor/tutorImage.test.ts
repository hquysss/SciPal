// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitWithin, MAX_BYTES, MAX_EDGE, prepareTutorImage } from './tutorImage';

describe('fitWithin', () => {
  it('shrinks the longer side to the limit and keeps the proportions', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_EDGE, height: 960 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 960, height: MAX_EDGE });
    expect(fitWithin(5000, 100, 1000)).toEqual({ width: 1000, height: 20 });
  });

  it('never enlarges a small picture, and never returns a zero side', () => {
    expect(fitWithin(300, 200)).toEqual({ width: 300, height: 200 });
    expect(fitWithin(10_000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe('prepareTutorImage', () => {
  const file = (type: string) => new File(['x'], 'a', { type });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** A browser that decodes any file to `width` × `height` and encodes JPEG at a size that depends on the quality. */
  function browser(width: number, height: number, sizeAt: (quality: number) => number) {
    const drawn: Array<[number, number]> = [];
    const qualities: number[] = [];
    vi.stubGlobal('createImageBitmap', async () => ({ width, height, close: () => {} }));
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:preview' }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({ fillRect: () => {}, drawImage: (_: unknown, __: number, ___: number, w: number, h: number) => drawn.push([w, h]) }) as never,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, _type, quality) => {
      qualities.push(Number(quality));
      callback(new Blob([new Uint8Array(sizeAt(Number(quality)))], { type: 'image/jpeg' }));
    });
    return { drawn, qualities };
  }

  it('turns a big picture into a JPEG no longer than 1280 px, as base64, with a preview', async () => {
    const seen = browser(4000, 3000, () => 1000);
    const result = await prepareTutorImage(file('image/png'));
    expect(result.ok && [result.image.mime, result.image.preview, result.image.data.length > 0]).toEqual(['image/jpeg', 'blob:preview', true]);
    expect(seen.drawn).toEqual([[1280, 960]]);
    expect(seen.qualities).toEqual([0.8]);
  });

  it('lowers the quality until the JPEG fits the server limit', async () => {
    const seen = browser(1000, 1000, (quality) => (quality > 0.6 ? MAX_BYTES + 1 : 1000));
    const result = await prepareTutorImage(file('image/jpeg'));
    expect(result.ok).toBe(true);
    expect(seen.qualities).toEqual([0.8, 0.65, 0.5]);
  });

  it('gives up with a message when even the lowest quality is too big', async () => {
    browser(1000, 1000, () => MAX_BYTES + 1);
    const result = await prepareTutorImage(file('image/webp'));
    expect(!result.ok && result.error.en).toMatch(/too large/);
  });

  it('refuses a file that is not a PNG, JPG or WEBP before reading it', async () => {
    const decode = vi.fn();
    vi.stubGlobal('createImageBitmap', decode);
    for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', '']) {
      const result = await prepareTutorImage(file(type));
      expect(result.ok, type).toBe(false);
    }
    expect(decode).not.toHaveBeenCalled();
  });

  it('says so when the picture cannot be decoded', async () => {
    vi.stubGlobal('createImageBitmap', async () => {
      throw new Error('corrupt');
    });
    const result = await prepareTutorImage(file('image/png'));
    expect(!result.ok && result.error.en).toMatch(/could not be read/);
  });
});
