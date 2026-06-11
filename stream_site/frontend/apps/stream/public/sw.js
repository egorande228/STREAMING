const CACHE_NAME = 'wc26-schedule-v2';

function isScheduleApi(pathname) {
  return pathname.startsWith('/api/matches');
}

function isSchedulePage(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 2 && parts[1] === 'schedule';
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const scheduleApi = isScheduleApi(url.pathname);
  const schedulePage = isSchedulePage(url.pathname);
  if (!scheduleApi && !schedulePage) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await cache.match(req);
        if (cached) return cached;

        if (scheduleApi) {
          return new Response(JSON.stringify({ matches: [], total: 0, offline: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response('Offline', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })()
  );
});
