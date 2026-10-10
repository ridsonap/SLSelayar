// Service Worker for SLS Finder Kepulauan Selayar
const CACHE_NAME = 'sls-selayar-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './Final_SLS_202517301.geojson'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell and GeoJSON');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests or browser extension requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // CRITICAL FOR IPHONE / SAFARI:
  // Never intercept map tile servers (google, osm, esri).
  // Let the browser natively handle tile streaming and HTTP caching directly!
  if (
    url.hostname.includes('google.com') ||
    url.hostname.includes('openstreetmap.org') ||
    url.hostname.includes('arcgisonline.com')
  ) {
    return;
  }

  // Only handle same-origin or explicit CDN libraries
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache external scripts & fonts dynamically if valid response
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.includes('unpkg.com') ||
           event.request.url.includes('cdn.tailwindcss.com') ||
           event.request.url.includes('fonts.googleapis.com'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });
    })
  );
});
