const CACHE_NAME = 'remote-desk-v3'; // BUMPED TO V3 TO FORCE UPDATE
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
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => Promise.all(
            names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
        ))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
