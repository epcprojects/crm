/* eslint-disable no-restricted-globals */
// Push-only service worker. It intentionally has no fetch handler and no
// caching, so it cannot serve stale pages or interfere with API calls.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Safari (iOS and macOS) requires every push to show a notification and may
// revoke the subscription otherwise, so foreground suppression is skipped there.
function isSafari() {
  const ua = self.navigator.userAgent || '';
  return (
    /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua)
  );
}

function setBadge(count) {
  const nav = self.navigator;
  if (typeof count !== 'number') return Promise.resolve();

  try {
    if (count > 0 && nav.setAppBadge) return nav.setAppBadge(count);
    if (count <= 0 && nav.clearAppBadge) return nav.clearAppBadge();
  } catch (e) {
    // Badging is best-effort.
  }
  return Promise.resolve();
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'New notification', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'New notification';
  const options = {
    body: data.body || '',
    icon: '/images/favicon/web-app-manifest-192x192.png',
    badge: '/images/favicon/favicon-96x96.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/notifications', notificationId: data.notificationId },
  };

  event.waitUntil(
    (async () => {
      await setBadge(data.unreadCount);

      if (!isSafari()) {
        const windows = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        const appIsInUse = windows.some(
          (w) => w.visibilityState === 'visible' && w.focused,
        );
        // The in-app socket toast already covers this case.
        if (appIsInUse) return;
      }

      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = new URL(
    (event.notification.data && event.notification.data.url) || '/notifications',
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          await client.focus();
          if ('navigate' in client) await client.navigate(target);
          return;
        } catch (e) {
          // Fall through to opening a new window.
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});
