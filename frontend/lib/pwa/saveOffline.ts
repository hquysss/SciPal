import { PAGES_CACHE, STATIC_CACHE } from './cacheNames';

// "Tải để học offline": fetch a subject's lesson pages now and keep them, with the built files each
// page needs, in the caches the service worker reads when there is no connection.

/** The built files (scripts, styles) a page's HTML refers to, once each. */
export function offlineAssetUrls(html: string): string[] {
  const found = html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [];
  return [...new Set(found)];
}

type Deps = { caches: CacheStorage; fetch: typeof fetch };

/** Keeps each page (by its path, as the service worker looks it up). A redirect or error is skipped. */
export async function savePagesOffline(
  urls: string[],
  onProgress: (done: number, total: number) => void = () => {},
  deps: Deps = { caches: globalThis.caches, fetch: globalThis.fetch.bind(globalThis) },
): Promise<{ saved: number; failed: number }> {
  const pages = await deps.caches.open(PAGES_CACHE);
  const files = await deps.caches.open(STATIC_CACHE);
  let saved = 0;
  let failed = 0;
  for (const [index, url] of urls.entries()) {
    try {
      const response = await deps.fetch(url, { credentials: 'same-origin' });
      if (!response.ok || response.redirected) throw new Error(`${url}: ${response.status}`);
      const html = await response.clone().text();
      await pages.put(url, response);
      for (const asset of offlineAssetUrls(html)) {
        if (!(await files.match(asset))) await files.add(asset).catch(() => {});
      }
      saved += 1;
    } catch {
      failed += 1;
    }
    onProgress(index + 1, urls.length);
  }
  return { saved, failed };
}
