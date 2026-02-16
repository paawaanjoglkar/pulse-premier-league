/**
 * PULSE PREMIER LEAGUE - Service Worker
 * Handles offline caching and PWA functionality
 */

const CACHE_NAME = 'ppl-cache-v1.1.0';
const BASE_PATH = '/pulse-premier-league/';
const urlsToCache = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'css/style.css',
    BASE_PATH + 'js/app.js',
    BASE_PATH + 'js/storage.js',
    BASE_PATH + 'js/utils.js',
    BASE_PATH + 'js/scoring.js',
    BASE_PATH + 'js/powerball.js',
    BASE_PATH + 'js/stats.js',
    BASE_PATH + 'js/mvp.js',
    BASE_PATH + 'js/points.js',
    BASE_PATH + 'js/sync.js',
    BASE_PATH + 'js/operation-queue.js',
    BASE_PATH + 'js/monitoring.js',
    BASE_PATH + 'js/retry-logic.js',
    BASE_PATH + 'js/error-handler.js',
    BASE_PATH + 'js/export.js',
    BASE_PATH + 'lib/xlsx.min.js',
    BASE_PATH + 'manifest.json'
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

