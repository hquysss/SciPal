import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { PAGES_CACHE, STATIC_CACHE } from './cacheNames';
import { offlineAssetUrls, savePagesOffline } from './saveOffline';

type SwPolicy = { PAGES: string; STATIC: string; OFFLINE_URL: string; pageKept: (p: string) => boolean; isStaticAsset: (p: string) => boolean; builtFiles: (html: string) => string[] };

/** Runs public/sw.js with a stand-in `self` and returns the decisions it exposes. */
function loadSw(): SwPolicy {
  const self: Record<string, unknown> = { addEventListener: () => {}, location: { origin: 'https://scipal.vercel.app' } };
  runInNewContext(readFileSync(join(__dirname, '../../public/sw.js'), 'utf8'), { self, caches: {}, URL, Response, fetch: () => {} });
  return self.__scipalSw as SwPolicy;
}

describe('service worker policy', () => {
  const sw = loadSw();

  it('uses the same cache names as the page', () => {
    expect(sw.PAGES).toBe(PAGES_CACHE);
    expect(sw.STATIC).toBe(STATIC_CACHE);
    expect(sw.OFFLINE_URL).toBe('/offline');
  });

  it('keeps learning pages for offline reading', () => {
    for (const path of ['/', '/subjects', '/glossary', '/pricing', '/privacy', '/informatics', '/informatics/vong-lap-for']) {
      expect(sw.pageKept(path), path).toBe(true);
    }
  });

  it('never keeps personal, staff or server-only pages', () => {
    for (const path of ['/profile', '/profile/plan', '/progress', '/teacher/lessons', '/admin/accounts', '/checkout/abc', '/classes', '/exam', '/exam/manage', '/login', '/auth/callback', '/tutor', '/dev/theme']) {
      expect(sw.pageKept(path), path).toBe(false);
    }
  });

  it('finds the built files of the offline page the same way the page does', () => {
    const html = '<link href="/_next/static/css/a.css"><script src="/_next/static/chunks/b.js"></script><script src="/_next/static/chunks/b.js"></script>';
    expect(sw.builtFiles(html)).toEqual(offlineAssetUrls(html));
  });

  it('caches built files and media, never itself', () => {
    expect(sw.isStaticAsset('/_next/static/chunks/app.js')).toBe(true);
    expect(sw.isStaticAsset('/mascots/owl-directions-324.webp')).toBe(true);
    expect(sw.isStaticAsset('/icons/icon-192.png')).toBe(true);
    expect(sw.isStaticAsset('/sw.js')).toBe(false);
    expect(sw.isStaticAsset('/informatics')).toBe(false);
  });
});

describe('saving a subject for offline', () => {
  it('finds the built files a page needs', () => {
    const html = '<link rel="stylesheet" href="/_next/static/css/a.css"><script src="/_next/static/chunks/b.js" async></script><script src="/_next/static/chunks/b.js"></script><img src="https://x.com/c.png">';
    expect(offlineAssetUrls(html)).toEqual(['/_next/static/css/a.css', '/_next/static/chunks/b.js']);
  });

  it('keeps each page and its files, reports progress, and skips pages that redirect', async () => {
    const pages = new Map<string, Response>();
    const files: string[] = [];
    const cacheStore = {
      open: vi.fn(async (name: string) =>
        name === PAGES_CACHE
          ? { put: async (key: string, res: Response) => void pages.set(key, res) }
          : { match: async () => undefined, add: async (url: string) => void files.push(url) },
      ),
    };
    const fetcher = vi.fn(async (url: string) =>
      url === '/informatics/b'
        ? ({ ok: true, redirected: true, text: async () => '' } as unknown as Response)
        : ({ ok: true, redirected: false, clone() { return this; }, text: async () => '<script src="/_next/static/chunks/x.js"></script>' } as unknown as Response),
    );
    const progress: Array<[number, number]> = [];

    const result = await savePagesOffline(['/informatics/a', '/informatics/b'], (done, total) => progress.push([done, total]), { caches: cacheStore as never, fetch: fetcher as never });

    expect(result).toEqual({ saved: 1, failed: 1 });
    expect([...pages.keys()]).toEqual(['/informatics/a']);
    expect(files).toEqual(['/_next/static/chunks/x.js']);
    expect(progress.at(-1)).toEqual([2, 2]);
  });
});
