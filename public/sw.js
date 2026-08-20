// DramaHub Optimized Service Worker
const CACHE_NAME = 'dramahub-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192.svg',
  '/screenshot-mobile.png',
  '/screenshot-desktop.png'
];

// Install Event - Pre-cache essential app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline app shell');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network-First for dynamic / API routes, cache fallback for assets
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Skip non-GET, browser extensions, and video / stream requests (prevent range errors and quota overflow)
  if (
    event.request.method !== 'GET' ||
    !url.startsWith('http') ||
    url.includes('/api/proxy-stream') ||
    url.endsWith('.mp4') ||
    url.endsWith('.m3u8') ||
    url.endsWith('.ts') ||
    url.endsWith('.webm') ||
    event.request.headers.get('range')
  ) {
    return;
  }

  // Handle standard HTTP requests
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache static JS/CSS/image assets
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.includes('.js') ||
           url.includes('.css') ||
           url.includes('.svg') ||
           url.includes('.png') ||
           url.includes('.webp') ||
           url.includes('/manifest.json'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
