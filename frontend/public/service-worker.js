/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'allone-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Only cache essential files without hashes
        // CSS and JS files will be cached dynamically by the fetch handler
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache open failed:', err))
  );
  self.skipWaiting();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Don't cache API calls - always fetch from network
  if (url.pathname.startsWith('/api/') || url.hostname === 'localhost' && url.port === '8000') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For navigation requests, always try network first, then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Return cached index.html if network fails
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // For static assets (CSS, JS, images, fonts), use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((response) => {
            // Only cache successful GET requests for static assets
            // This includes CSS, JS, images, fonts, etc. with their hashed filenames
            if (event.request.method === 'GET' && 
                response.status === 200 && 
                response.type === 'basic' &&
                !url.pathname.startsWith('/api/')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(() => {
            // For non-navigation requests, return the cached version if available
            return caches.match(event.request);
          });
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-passwords') {
    event.waitUntil(syncPasswords());
  }
});

async function syncPasswords() {
  // Implement password sync logic
  console.log('Syncing passwords...');
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'AllOne';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/Alloneicon.png',
    badge: '/Alloneicon.png',
    vibrate: [200, 100, 200],
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});