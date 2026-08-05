// Service Worker - DrDer Chess
// يدعم العمل الكامل دون اتصال بالإنترنت (Offline First)

const CACHE_NAME = 'drder-chess-v1';

// قائمة الملفات المطلوب تخزينها للعمل دون إنترنت
const FILES_TO_CACHE = [
  'index.html',
  'style.css',
  'app.js',
  'engine.js',
  'manifest.json',
  '192.png',
  '512.png'
];

// حدث التثبيت: تخزين جميع الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('جاري تخزين الملفات في الكاش...');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('تم تثبيت Service Worker بنجاح.');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('فشل في تخزين الملفات:', error);
      })
  );
});

// حدث التفعيل: تنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('حذف الكاش القديم:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('تم تفعيل Service Worker بنجاح.');
        return self.clients.claim();
      })
  );
});

// حدث الجلب: استراتيجية Cache First ثم Network Fallback
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات chrome-extension والطلبات غير GET
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // إرجاع الملف من الكاش إذا كان موجوداً
        if (cachedResponse) {
          return cachedResponse;
        }

        // محاولة جلب الملف من الشبكة وتخزينه للمستقبل
        return fetch(event.request)
          .then((networkResponse) => {
            // التأكد من صلاحية الاستجابة
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // نسخ الاستجابة لأنها تستهلك مرة واحدة
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn('فشل في تخزين الملف الجديد:', error);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.warn('فشل الجلب من الشبكة:', error);
            // يمكن إرجاع صفحة offline هنا إذا كانت موجودة
            return new Response('غير متصل بالإنترنت', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
