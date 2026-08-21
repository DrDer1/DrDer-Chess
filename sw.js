// ================ DrDer Chess - Service Worker ================

const CACHE_NAME = 'drder-chess-v4.0.0';
const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'style.css',
    'app.js',
    'game.js',
    'manifest.json',
    'chess.min.js',
    'stockfish.js',
    '192.png',
    '512.png'
];

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return Promise.allSettled(
                    ASSETS_TO_CACHE.map(asset => {
                        return cache.add(asset).catch(error => {
                            console.warn(`[SW] Failed to cache: ${asset}`, error);
                        });
                    })
                );
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch((error) => {
                        if (event.request.mode === 'navigate') {
                            return caches.match('index.html');
                        }
                        throw error;
                    });
            })
    );
});
