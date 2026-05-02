// =========================================================
// Service Worker — Scout Ball PWA
// =========================================================
const CACHE_NAME = 'scout-ball-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Instalar: cachea los assets esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activar: limpia caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: estrategia "network first, cache fallback"
// Esto asegura que los usuarios siempre vean la versión más reciente cuando hay red,
// pero pueden seguir usando la app offline.
self.addEventListener('fetch', (event) => {
  // Solo cachear GET requests
  if (event.request.method !== 'GET') return;

  // No cachear requests a Firebase/Firestore (esos van directo a la red siempre)
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, la guardamos en caché
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intenta servir desde caché
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('/index.html');
        });
      })
  );
});