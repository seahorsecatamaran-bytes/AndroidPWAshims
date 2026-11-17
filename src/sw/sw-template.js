/**
 * DualMode PWA Toolkit - Service Worker Source Template
 * Provides self-updating cache management, skipWaiting, clients.claim, and offline fallback.
 */
export function generateServiceWorkerSource(appName = 'DualModeApp', version = '1.0.0', customAssets = []) {
  const cacheName = `${appName.toLowerCase().replace(/[^a-z0-9_-]/g, '')}-v${version}`;
  const assetsJson = JSON.stringify([
    './',
    './index.html',
    './manifest.webmanifest',
    ...customAssets
  ], null, 2);

  return `/* Service Worker for ${appName} (v${version}) */
const CACHE_NAME = '${cacheName}';
const PRECACHE_ASSETS = ${assetsJson};

// Install: pre-cache static resources and take immediate control
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical precache issue:', err);
      });
    })
  );
});

// Activate: purge obsolete caches and claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('${appName.toLowerCase().replace(/[^a-z0-9_-]/g, '')}-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate with network fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip caching browser-extension calls or non-HTTP schemas
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for explicit manual update commands
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
`;
}
