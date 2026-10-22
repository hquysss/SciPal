import { describe, expect, it } from 'vitest';
import { defaultImageQuestion, parseTutorImage, removeAllTutorImages, signTutorImages, TUTOR_CHAT_BODY_MAX, TUTOR_IMAGE_MAX, tutorImageKey } from '../tutor/images.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const b64 = (bytes: Buffer) => bytes.toString('base64');

describe('parseTutorImage', () => {
  it('accepts a PNG or JPEG and reports the type from its bytes', () => {
    const png = parseTutorImage({ mime: 'image/png', data: b64(PNG) });
    expect(png.ok && png.image.type).toBe('png');
    const jpeg = parseTutorImage({ mime: 'image/jpeg', data: b64(JPEG) });
    expect(jpeg.ok && [jpeg.image.type, jpeg.image.mime, jpeg.image.bytes.length]).toEqual(['jpeg', 'image/jpeg', JPEG.length]);
  });

  it('trusts the bytes, not the claimed type: a JPEG sent as image/png is stored as a JPEG', () => {
    const result = parseTutorImage({ mime: 'image/png', data: b64(JPEG) });
    expect(result.ok && result.image.mime).toBe('image/jpeg');
  });

  it('refuses what is not a picture of an allowed type', () => {
    const gif = Buffer.from('GIF89a' + 'x'.repeat(40));
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    for (const value of [
      { mime: 'image/gif', data: b64(gif) },
      { mime: 'image/png', data: b64(gif) },
      { mime: 'image/svg+xml', data: b64(svg) },
      { mime: 'image/png', data: 'not base64!' },
      { mime: 'image/png', data: '' },
      { mime: 'image/png', data: 'abc' },
      { mime: 'image/png' },
      { data: b64(PNG) },
      'image',
      null,
      [],
    ]) {
      const result = parseTutorImage(value);
      expect(result.ok, JSON.stringify(value)).toBe(false);
    }
  });

  it('refuses a picture over 1.5 MB, before decoding it', () => {
    const big = Buffer.concat([PNG, Buffer.alloc(TUTOR_IMAGE_MAX)]);
    const result = parseTutorImage({ mime: 'image/png', data: b64(big) });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.error_en).toMatch(/1\.5 MB/);
  });

  it('leaves room in the request body for the picture as base64', () => {
    expect(TUTOR_CHAT_BODY_MAX).toBeGreaterThan((TUTOR_IMAGE_MAX * 4) / 3);
  });
});

describe('keys and wording', () => {
  it('keeps a picture under its owner and conversation, with a name nobody can guess', () => {
    const a = tutorImageKey('u1', 'c1', 'jpeg');
    expect(a).toMatch(/^u1\/c1\/[0-9a-f-]{36}\.jpg$/);
    expect(tutorImageKey('u1', 'c1', 'jpeg')).not.toBe(a);
    expect(tutorImageKey('u1', 'c1', 'webp')).toMatch(/\.webp$/);
  });

  it('has a default question in both languages', () => {
    expect(defaultImageQuestion('vi')).toMatch(/ảnh/);
    expect(defaultImageQuestion('en')).toMatch(/picture/);
  });
});

/** A storage client over a fake bucket: paths → whether each is a file. */
function fakeStorage(files: string[]) {
  const removed: string[][] = [];
  const children = (prefix: string) => {
    const names = new Map<string, boolean>();
    for (const path of files) {
      if (!path.startsWith(prefix + '/')) continue;
      const rest = path.slice(prefix.length + 1).split('/');
      names.set(rest[0]!, rest.length === 1);
    }
    return [...names].map(([name, file]) => ({ name, id: file ? `id-${name}` : null }));
  };
  const storage = {
    from: () => ({
      list: async (prefix: string, opts: { limit: number; offset: number }) => ({ data: children(prefix).slice(opts.offset, opts.offset + opts.limit), error: null }),
      remove: async (paths: string[]) => {
        removed.push(paths);
        return { data: [], error: null };
      },
      createSignedUrls: async (paths: string[]) => ({
        data: paths.map((path) => (path.includes('bad') ? { path, signedUrl: '', error: 'nope' } : { path, signedUrl: `https://signed.test/${path}`, error: null })),
        error: null,
      }),
    }),
  };
  return { storage: storage as never, removed };
}

describe('stored pictures', () => {
  it('removes every picture under the user, across conversation folders', async () => {
    const { storage, removed } = fakeStorage(['u1/c1/a.jpg', 'u1/c1/b.jpg', 'u1/c2/c.jpg', 'u2/c9/z.jpg']);
    await removeAllTutorImages(storage, 'u1');
    expect(removed.flat().sort()).toEqual(['u1/c1/a.jpg', 'u1/c1/b.jpg', 'u1/c2/c.jpg']);
  });

  it('signs the paths it can and leaves the others out', async () => {
    const { storage } = fakeStorage([]);
    const links = await signTutorImages(storage, ['u1/c1/a.jpg', 'u1/c1/bad.jpg']);
    expect([...links.keys()]).toEqual(['u1/c1/a.jpg']);
    expect(links.get('u1/c1/a.jpg')).toBe('https://signed.test/u1/c1/a.jpg');
    expect((await signTutorImages(storage, [])).size).toBe(0);
  });
});
