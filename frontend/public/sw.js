/* SciPal service worker: the app opens and lessons read without a connection.
 *
 * - Pages (navigations): network first; a page that loaded is kept, so it opens offline later. Only
 *   learning pages are kept (subjects, lessons, glossary…); personal and staff pages never are, so a
 *   shared phone does not show someone's profile or classes offline. Offline with nothing kept: /offline.
 * - Built files, fonts and images: cache first (their names change when their content does).
 * - Everything else (API calls, other sites, POST, Next's RSC requests): straight to the network.
 *
 * Cache names must match frontend/lib/pwa/cacheNames.ts (a test checks). Bump VERSION to drop old caches.
 */

const VERSION = 'v1';
const PAGES = `scipal-pages-${VERSION}`;
const STATIC = `scipal-static-${VERSION}`;
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/logo.svg'];

/** Paths whose pages hold personal or staff data, or need the server to work at all. */
const NOT_KEPT = ['/profile', '/progress', '/teacher', '/admin', '/checkout', '/classes', '/exam', '/login', '/auth', '/api', '/dev', '/tutor'];

function pageKept(pathname) {
  return !NOT_KEPT.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isStaticAsset(pathname) {
  if (pathname === '/sw.js') return false;
  return pathname.startsWith('/_next/static/') || /\.(?:png|svg|webp|jpe?g|gif|ico|woff2?|ttf|css|js)$/.test(pathname);
}

function isRscRequest(request, url) {
  return request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');
}

/** The built files (scripts, styles) a page's HTML refers to, once each. Same as lib/pwa/saveOffline.ts. */
function builtFiles(html) {
  return [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [])];
}

// Keep the offline page with the styles and scripts it needs, so it is styled when shown without a connection.
async function precache() {
  const cache = await caches.open(STATIC);
  await cache.addAll(PRECACHE);
  const offline = await cache.match(OFFLINE_URL);
  if (!offline) return;
  const files = builtFiles(await offline.clone().text());
  await Promise.all(files.map((file) => cache.add(file).catch(() => {})));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('scipal-') && key !== PAGES && key !== STATIC).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function pageFromNetwork(request, url) {
  try {
    const response = await fetch(request);
    // A redirect (sign-in, trial ended) or an error is not the page: do not keep it.
    if (response.ok && !response.redirected && response.type === 'basic' && pageKept(url.pathname)) {
      const copy = response.clone();
      caches.open(PAGES).then((cache) => cache.put(url.pathname, copy));
    }
    return response;
  } catch {
    const kept = pageKept(url.pathname) ? await caches.match(url.pathname, { cacheName: PAGES }) : undefined;
    return kept ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function assetFromCache(request) {
  const kept = await caches.match(request);
  if (kept) return kept;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(STATIC).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isRscRequest(request, url)) return;
  if (request.mode === 'navigate') {
    event.respondWith(pageFromNetwork(request, url));
    return;
  }
  if (isStaticAsset(url.pathname)) event.respondWith(assetFromCache(request));
});

// For tests: the decisions, without the browser around them.
self.__scipalSw = { PAGES, STATIC, OFFLINE_URL, pageKept, isStaticAsset, builtFiles };
