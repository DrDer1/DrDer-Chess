/* ============================================
   DrDer Chess - Service Worker
   Offline First - Cache First Strategy
   ============================================ */
'use strict';

const CACHE = 'drder-chess-v1';
const FILES = [
  'index.html',
  'style.css',
  'app.js',
  'engine.js',
  'manifest.json',
  '192.png',
  '512.png'
];

/* ---------- تثبيت ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
      .catch(err => console.error('SW install failed:', err))
  );
});

/* ---------- تفعيل ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---------- جلب ---------- */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) return response;
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, clone));
            return response;
          })
          .catch(() => new Response('Offline', { status: 503 }));
      })
  );
});
