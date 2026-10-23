const CACHE_NAME = 'nel-stock-v49';
const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'src/styles.css',
  'src/app.js',
  'src/admin.js',
  'voucher-template.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      ))
      .then(() => clients.claim())
  );
});

function cacheResponse(request, response) {
  const responseToCache = response.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
  return response;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin === location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => cacheResponse(event.request, response))
        .catch(() => caches.match(event.request).then(response => response || caches.match('index.html')))
    );
    return;
  }

  if (requestUrl.host === 'www.gstatic.com' || requestUrl.host.includes('fonts')) {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request).then(networkResponse =>
        cacheResponse(event.request, networkResponse)
      ))
    );
  }
});
