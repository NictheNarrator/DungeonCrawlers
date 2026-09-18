// Offline support for DungeonCrawlers.
//
// Strategy: network-first with a cache fallback, plus a precache at install
// time. Network-first keeps local development honest, because an edited file
// is never masked by a stale copy, while the precache means the first launch
// after losing a connection still works. Cache entries are keyed by the full
// request, so the ?v= query strings in index.html are cached as written.
const CACHE = 'dungeoncrawlers-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icon.svg',
  './apple-touch-icon.png',
  './src/app.mjs',
  './src/engine.mjs',
  './src/npcs.mjs',
  './src/controls.mjs',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  // Only same-origin GETs are ours to answer. Fonts and anything else the
  // browser or a future feature reaches for stay untouched.
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      // A navigation to any known path falls back to the game shell, so a
      // Home Screen launch works even when the start URL is a directory.
      if (request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw new Error('Offline and not cached');
    }
  })());
});
