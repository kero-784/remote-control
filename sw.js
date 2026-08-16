
const CACHE_NAME = 'remote-desk-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './login.html',
    './dashboard.html',
    './remote.html',
    './css/main.css',
    './css/login.css',
    './css/dashboard.css',
    './css/remote.css',
    './js/app.js',
    './js/auth.js',
    './js/dashboard.js',
    './js/remote.js',
    './js/websocket.js',
    './js/webrtc.js',
    './js/input.js',
    './js/utils.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                          .map(name => caches.delete(name))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Return cached version or fetch from network
            return response || fetch(event.request);
        })
    );
});