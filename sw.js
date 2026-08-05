/* ============================================
   DrDer Chess - Service Worker
   Offline First + تحديث تلقائي
   ============================================ */
'use strict';

/* إصدار الكاش - تغييره يؤدي لتحديث جميع الملفات تلقائياً */
const CACHE_VERSION = 'drder-chess-v2';
const CACHE_NAME = CACHE_VERSION;

/* الملفات المطلوب تخزينها */
const FILES_TO_CACHE = [
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
  console.log('[SW] تثبيت الإصدار:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] تخزين الملفات...');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] تم التثبيت بنجاح - تخطي الانتظار');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] فشل التثبيت:', err);
      })
  );
});

/* ---------- تفعيل ---------- */
self.addEventListener('activate', event => {
  console.log('[SW] تفعيل الإصدار:', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] حذف الكاش القديم:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] تم التفعيل - السيطرة على جميع العملاء');
        return self.clients.claim();
      })
  );
});

/* ---------- جلب ---------- */
self.addEventListener('fetch', event => {
  /* تجاهل الطلبات غير GET */
  if (event.request.method !== 'GET') return;

  /* استراتيجية Cache First مع تحديث في الخلفية */
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          /* تحديث الكاش في الخلفية للحصول على نسخة أحدث */
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, networkResponse.clone()));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        /* الملف غير موجود في الكاش - جلبه من الشبكة */
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            /* تخزين النسخة الجديدة */
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
            return networkResponse;
          })
          .catch(() => {
            /* إرجاع رسالة عند عدم التوفر */
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return new Response(
                '<html dir="rtl"><body style="background:#1a1a1a;color:#f0f0f0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center"><div><h1 style="color:#c8a45c">DrDer Chess</h1><p>غير متصل بالإنترنت</p><p>يرجى الاتصال للتحميل الأول</p></div></body></html>',
                { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            }
            return new Response('غير متصل بالإنترنت', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});

/* ---------- إعلام المستخدمين بالتحديث ---------- */
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
