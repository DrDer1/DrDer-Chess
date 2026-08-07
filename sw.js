/* ============================================
   DrDer Chess - Service Worker
   Network First للملفات الديناميكية
   Cache First للملفات الثابتة
   ============================================ */
'use strict';

/* إصدار الكاش */
const CACHE_VERSION = 'drder-chess-v3';
const CACHE_NAME = CACHE_VERSION;

/* الملفات الثابتة (نادراً ما تتغير) */
const STATIC_FILES = [
  'index.html',
  'manifest.json',
  '192.png',
  '512.png'
];

/* الملفات الديناميكية (تتغير مع التحديثات) */
const DYNAMIC_FILES = [
  'app.js',
  'engine.js',
  'style.css'
];

/* جميع الملفات للتخزين المبدئي */
const ALL_FILES = [...STATIC_FILES, ...DYNAMIC_FILES];

/* ---------- تثبيت ---------- */
self.addEventListener('install', event => {
  console.log('[SW] تثبيت:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] تخزين جميع الملفات...');
        return cache.addAll(ALL_FILES);
      })
      .then(() => {
        console.log('[SW] تثبيت ناجح - تخطي الانتظار');
        return self.skipWaiting();
      })
      .catch(err => console.error('[SW] فشل التثبيت:', err))
  );
});

/* ---------- تفعيل ---------- */
self.addEventListener('activate', event => {
  console.log('[SW] تفعيل:', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => {
              /* حذف الكاش القديم الخاص بـ DrDer فقط */
              return name.startsWith('drder-chess-') && name !== CACHE_NAME;
            })
            .map(name => {
              console.log('[SW] حذف الكاش القديم:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] تفعيل ناجح - السيطرة على العملاء');
        return self.clients.claim();
      })
  );
});

/* ---------- جلب ---------- */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const path = url.pathname.split('/').pop();

  /* تحديد استراتيجية الجلب */
  if (DYNAMIC_FILES.includes(path)) {
    /* Network First للملفات الديناميكية */
    event.respondWith(networkFirst(event.request));
  } else if (STATIC_FILES.includes(path)) {
    /* Cache First للملفات الثابتة */
    event.respondWith(cacheFirst(event.request));
  } else {
    /* للملفات الأخرى - Cache First مع fallback */
    event.respondWith(cacheFirst(event.request));
  }
});

/* استراتيجية Network First */
function networkFirst(request) {
  return fetch(request)
    .then(networkResponse => {
      if (!networkResponse || networkResponse.status !== 200) {
        return caches.match(request);
      }
      /* تحديث الكاش */
      const responseClone = networkResponse.clone();
      caches.open(CACHE_NAME)
        .then(cache => cache.put(request, responseClone));
      return networkResponse;
    })
    .catch(() => {
      return caches.match(request)
        .then(cached => {
          if (cached) return cached;
          return new Response('غير متصل بالإنترنت', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
    });
}

/* استراتيجية Cache First */
function cacheFirst(request) {
  return caches.match(request)
    .then(cached => {
      if (cached) {
        /* تحديث الكاش في الخلفية */
        fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cached;
      }
      /* غير موجود في الكاش - جلبه من الشبكة */
      return fetch(request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => {
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('index.html');
          }
          return new Response('غير متصل بالإنترنت', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
    });
}
