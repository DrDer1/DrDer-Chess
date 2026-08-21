// ================ DrDer Chess - Service Worker ================

const CACHE_NAME = 'drder-chess-v2.0.0';
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
    '512.png',
    'move.mp3',
    'capture.mp3',
    'check.mp3',
    'checkmate.mp3',
    'promote.mp3'
];

// ================ Install Event ================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell and assets');
                
                return Promise.allSettled(
                    ASSETS_TO_CACHE.map(asset => {
                        return cache.add(asset).catch(error => {
                            console.warn(`[SW] Failed to cache: ${asset}`, error);
                        });
                    })
                );
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
    );
});

// ================ Activate Event ================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// ================ Fetch Event (Cache First Strategy) ================
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    updateCache(event.request, CACHE_NAME);
                    return cachedResponse;
                }
                
                return fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch(error => {
                                    console.warn('[SW] Failed to update cache:', error);
                                });
                        }
                        
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('[SW] Fetch failed:', error);
                        
                        if (event.request.mode === 'navigate') {
                            return caches.match('index.html');
                        }
                        
                        throw error;
                    });
            })
    );
});

// ================ Background Cache Update ================
function updateCache(request, cacheName) {
    const url = new URL(request.url);
    if (url.pathname.includes('chrome-extension')) return;
    
    fetch(request)
        .then((response) => {
            if (response && response.status === 200) {
                caches.open(cacheName)
                    .then((cache) => {
                        cache.put(request, response.clone());
                    })
                    .catch(error => {
                        console.warn('[SW] Background cache update failed:', error);
                    });
            }
        })
        .catch(() => {
            // Silently fail background updates
        });
}

// ================ Message Handling ================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CHECK_UPDATE') {
        self.clients.matchAll().then((clients) => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'UPDATE_STATUS',
                    version: CACHE_NAME
                });
            });
        });
    }
});

// ================ Push Notification Support ================
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body || 'حان دورك في DrDer Chess',
            icon: '192.png',
            badge: '192.png',
            lang: 'ar',
            dir: 'rtl',
            vibrate: [200, 100, 200],
            tag: 'drder-chess',
            renotify: true,
            requireInteraction: false
        };
        
        event.waitUntil(
            self.registration.showNotification(
                data.title || 'DrDer Chess',
                options
            )
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window' })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (self.clients.openWindow) {
                    return self.clients.openWindow('./');
                }
            })
    );
});

// ================ Lifecycle Events ================
self.addEventListener('error', (event) => {
    console.error('[SW] Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled Promise Rejection:', event.reason);
});
