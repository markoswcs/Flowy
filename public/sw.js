self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  return self.clients.claim();
});

// No fetch handler on purpose: an empty one adds a service-worker hop to
// every request and slows each page load, and installing no longer needs it.

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
