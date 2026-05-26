const CACHE_NAME = 'trainees-accounting-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin/dashboard.html',
  '/trainee/dashboard.html',
  '/js/app.js',
  '/js/admin-dashboard.js',
  '/js/trainee-dashboard.js',
  '/js/bootstrap.bundle.min.js',
  '/css/bootstrap.min.css',
  '/css/bootstrap-icons.css',
  '/manifest.json',
  '/favicon.ico',
  '/images/icon-192x192.svg',
  '/images/icon-512x512.svg',
  '/images/icon-maskable.svg'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Events
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  const fallbackResponse = (isApi = false) => {
    return caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      if (isApi) {
        return new Response(JSON.stringify({ error: 'Service unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Return a proper offline/error page instead of Response.error()
      return new Response(
        '<html><body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;"><div style="text-align: center;"><h1>Offline</h1><p>Cannot reach the server. Please check your connection and try again.</p></div></body></html>',
        {
          status: 503,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    });
  };

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Let external CDN resources (scripts, stylesheets, fonts) pass through without caching
  if (!isSameOrigin && (request.destination === 'script' || request.destination === 'style' || request.destination === 'font')) {
    event.respondWith(
      fetch(request, { credentials: 'omit' })
        .then((response) => {
          // Return successful responses as-is
          if (response && response.status === 200) {
            return response;
          }
          // For failed CDN requests, just return the error silently (no Response.error() which triggers warnings)
          return response;
        })
        .catch(() => {
          // Network error - just fail silently without logging
          return new Response(null, { status: 404 });
        })
    );
    return;
  }

  // API requests - network first, fall back to cache
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return fallbackResponse(true);
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });

          return response;
        })
        .catch(() => fallbackResponse(true))
    );
    return;
  }

  if (request.destination === 'script' || request.destination === 'document' || request.url.endsWith('.js') || request.url.endsWith('.html')) {
    // Network-first for JS and HTML so updated app logic is always loaded
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return fallbackResponse();
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });

          return response;
        })
        .catch(() => fallbackResponse())
    );
    return;
  }

  // Static assets - cache first, fall back to network
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200) {
              return fallbackResponse();
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => fallbackResponse());
      })
  );
});

// Background Sync (when connection is restored)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-requests') {
    event.waitUntil(syncRequests());
  }
});

async function syncRequests() {
  console.log('Background sync triggered');
  // Implement sync logic for offline requests
}
