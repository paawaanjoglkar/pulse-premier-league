/**
 * PULSE PREMIER LEAGUE - Service Worker
 * Handles offline caching and PWA functionality
 */

const CACHE_NAME = 'ppl-cache-v1.1.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/storage.js',
    '/js/utils.js',
    '/js/scoring.js',
    '/js/powerball.js',
    '/js/stats.js',
    '/js/mvp.js',
    '/js/points.js',
    '/js/sync.js',
    '/js/operation-queue.js',
    '/js/monitoring.js',
    '/js/retry-logic.js',
    '/js/error-handler.js',
    '/js/export.js',
    '/lib/xlsx.min.js',
    '/manifest.json'
];

// Install event - cache all files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return cached response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    // Cache the fetched response
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // Network failed and no cache - return offline page
            })
    );
});

// Background sync for future implementation
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        // Future: Implement auto-sync to GitHub
    }
});

// Push notifications for future implementation
self.addEventListener('push', (event) => {
    // Future: Implement push notifications
});

