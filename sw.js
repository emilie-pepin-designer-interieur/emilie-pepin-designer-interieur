// Service Worker v29 - Note vocale, epingles plan, kilometrage MileIQ v2, ecran OneDrive, compte-rendu par visite
const CACHE_NAME = 'emilie-pepin-v29';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
