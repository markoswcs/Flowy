// Keep in sync with PAGE_CACHE in src/lib/device-cache.ts (cleared on sign-out).
const PAGE_CACHE = 'flowy-pages-v1';
const STATIC_CACHE = 'flowy-static-v1';
const MAX_PAGES = 20;
const MAX_STATIC = 400;
// `next dev` registers /sw.js?dev=1: its files change under the same names.
const CACHING = !new URL(self.location.href).searchParams.has('dev');

// Keep in sync with RETIRED_HOSTS / CURRENT_ORIGIN in src/proxy.ts. An app
// installed from an old address opened its saved copy forever and never got
// updates; there the worker shows how to move instead (reminders keep coming).
const CURRENT_ORIGIN = 'https://useflowy.vercel.app';
const RETIRED = ['flowy-mauve.vercel.app'].includes(self.location.hostname);

const MOVED_PAGE = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0d041e"><title>O Flowy mudou de endereço</title>
<style>
body{margin:0;min-height:100dvh;background:#0d041e;color:#f4f0ff;font:16px/1.5 system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px max(20px,env(safe-area-inset-right)) 24px max(20px,env(safe-area-inset-left));box-sizing:border-box}
main{max-width:420px;width:100%}
h1{font-size:24px;line-height:1.25;margin:16px 0 8px}
p{color:#c9bfe6;margin:0 0 16px}
.logo{width:64px;height:64px;border-radius:18px}
a.button{display:block;text-align:center;background:#8b5cf6;color:#fff;font-weight:600;text-decoration:none;padding:16px;border-radius:16px;margin:20px 0}
section{background:#1a1033;border:1px solid #2e2150;border-radius:18px;padding:16px;margin-top:12px}
h2{font-size:15px;margin:0 0 8px}
ol{margin:0;padding-left:20px;color:#ddd5f5}li{margin:6px 0}
small{display:block;color:#9d93bd;margin-top:16px}
</style></head><body><main>
<img class="logo" src="${CURRENT_ORIGIN}/icon-192.png" alt="">
<h1>O Flowy mudou de endereço</h1>
<p>Agora ele fica em <strong>useflowy.vercel.app</strong>. Suas tarefas e notas continuam lá: é só entrar com o mesmo e-mail ou com o Google.</p>
<a class="button" href="${CURRENT_ORIGIN}/app" target="_blank" rel="noopener">Abrir o novo Flowy</a>
<section><h2>No iPhone</h2><ol>
<li>Toque no botão acima. Se abrir aqui dentro, toque em <strong>Abrir no Safari</strong>.</li>
<li>No Safari, toque em <strong>Compartilhar</strong> (o quadrado com a seta para cima).</li>
<li>Toque em <strong>Adicionar à Tela de Início</strong> e depois em <strong>Adicionar</strong>.</li>
<li>Abra o Flowy pelo ícone novo, entre e toque em <strong>Ativar lembretes</strong>.</li>
<li>Pode apagar este ícone antigo.</li></ol></section>
<section><h2>No Android</h2><ol>
<li>Toque no botão acima para abrir no Chrome.</li>
<li>Toque em <strong>Instalar</strong> (ou no menu ⋮ → Instalar app).</li>
<li>Abra o Flowy novo, entre e ative os lembretes.</li>
<li>Pode desinstalar este app antigo.</li></ol></section>
<small>Até lá, os lembretes continuam chegando por aqui.</small>
</main></body></html>`;

function movedPage() {
  return new Response(MOVED_PAGE, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // The saved pages of the old address would keep showing the old app.
      RETIRED ? caches.delete(PAGE_CACHE) : undefined,
    ]),
  );
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
  if (!event.origin || event.origin !== self.location.origin) return;
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
  if (RETIRED) {
    event.respondWith(movedPage());
    return;
  }
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
  // On the old address a tap shows how to move (the navigation gets the moved page).

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
