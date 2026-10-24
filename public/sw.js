// Keep in sync with PAGE_CACHE in src/lib/device-cache.ts (cleared on sign-out).
const PAGE_CACHE = 'flowy-pages-v1';
const STATIC_CACHE = 'flowy-static-v1';
const MAX_PAGES = 20;
const MAX_STATIC = 400;
// `next dev` registers /sw.js?dev=1: its files change under the same names.
const CACHING = !new URL(self.location.href).searchParams.has('dev');

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/** Oldest entries go first: Cache Storage keeps insertion order. */
async function trim(cache, max) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

function buildOf(html) {
  const match = html.match(/<meta name="flowy-build" content="([^"]*)"/);
  return match ? match[1] : '';
}

// The page may not be listening yet when its refresh finishes, so the news
// also waits here until it says it is ready (best effort: lost if the worker stops).
const pending = new Map();

async function tellClient(clientId, message) {
  if (!clientId) return;
  pending.set(clientId, message);
  const client = await self.clients.get(clientId);
  if (client) client.postMessage(message);
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'flowy:ready' || !event.source) return;
  const message = pending.get(event.source.id);
  pending.delete(event.source.id);
  if (message) event.source.postMessage(message);
});

// Build files never change once published (their names carry a hash): serve
// them from this device after the first download.
async function staticFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trim(cache, MAX_STATIC);
  }
  return response;
}

async function savePage(cache, request, response) {
  // A redirected response cannot answer a navigation later: keep only direct pages.
  const type = response.headers.get('content-type') || '';
  if (response.status !== 200 || response.redirected || !type.includes('text/html')) return null;
  // Both copies are taken now, before the page starts reading the original.
  const forCache = response.clone();
  const html = await response.clone().text();
  await cache.put(request, forCache);
  await trim(cache, MAX_PAGES);
  return html;
}

async function refreshPage(cache, request, cached, clientId) {
  // Its own request, following redirects, so a trip to /login can be seen.
  const response = await fetch(request.url, {
    credentials: 'same-origin',
    headers: { accept: 'text/html' },
  });
  if (response.redirected && !new URL(response.url).pathname.startsWith('/app')) {
    await caches.delete(PAGE_CACHE);
    await tellClient(clientId, { type: 'flowy:signed-out', url: response.url });
    return;
  }
  const html = await savePage(cache, request, response);
  if (html !== null && buildOf(await cached.text()) !== buildOf(html)) {
    await tellClient(clientId, { type: 'flowy:new-version' });
  }
}

// Pages of the signed-in app open from this device's last copy right away,
// while the network fetches a fresh one for next time. The server still
// checks the session on that fetch: when it sends the person to /login, the
// copies are dropped and the open window follows.
async function pageFromCache(event) {
  const cache = await caches.open(PAGE_CACHE);
  const cached = await cache.match(event.request);
  if (cached) {
    event.waitUntil(refreshPage(cache, event.request, cached.clone(), event.resultingClientId).catch(() => undefined));
    return cached;
  }
  const response = await fetch(event.request);
  event.waitUntil(savePage(cache, event.request, response).catch(() => undefined));
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!CACHING || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staticFirst(request));
    return;
  }
  if (request.mode !== 'navigate') return;
  if (url.pathname === '/app' || url.pathname.startsWith('/app/')) {
    event.respondWith(pageFromCache(event));
    return;
  }
  // Signing in again starts from nothing, whoever it is.
  if (url.pathname === '/login') {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }
});

// Task reminders sent by /api/cron/reminders.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Flowy', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || '/app' },
    }),
  );
});

// The browser may replace a subscription at any time. Subscribe again with the
// same key right away; the app saves the new one on the account when it opens.
self.addEventListener('pushsubscriptionchange', (event) => {
  const options = event.oldSubscription && event.oldSubscription.options;
  if (!options || !options.applicationServerKey) return;
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: options.applicationServerKey,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/app', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        // Focus first, while the click still counts as a user gesture.
        return existing
          .focus()
          .then((client) => (client || existing).navigate(url))
          .catch(() => undefined);
      }
      return self.clients.openWindow(url);
    }),
  );
});
