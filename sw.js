const CACHE_NAME = 'emilie-pepin-v2';
const ASSETS = ['/emilie-pepin-designer-interieur/', '/emilie-pepin-designer-interieur/index.html', '/emilie-pepin-designer-interieur/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Ne jamais intercepter les requêtes d'authentification Microsoft
  const url = e.request.url;
  if(url.includes('login.microsoftonline.com') || 
     url.includes('graph.microsoft.com') ||
     url.includes('access_token') ||
     url.includes('api.anthropic.com') ||
     url.includes('fonts.googleapis.com')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/emilie-pepin-designer-interieur/index.html')))
  );
});
