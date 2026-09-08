/* Saver Market service worker: PWA shell + admin Web Push.
   It deliberately does not cache website HTML/data, so product/admin updates
   are not held back by an old cache. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "Saver Admin", body: event.data ? event.data.text() : "New Saver Market activity" };
  }

  const title = data.title || "Saver Admin";
  const options = {
    body: data.body || "New Saver Market activity",
    icon: data.icon || "saver-admin-icon-192.png",
    badge: data.badge || "saver-admin-icon-192.png",
    tag: data.tag || "saver-admin-update",
    renotify: true,
    data: { url: data?.data?.url || data.url || "admin.html" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const relativeTarget = event.notification?.data?.url || "admin.html";
  const target = new URL(relativeTarget, self.registration.scope).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("navigate" in client) {
        try { await client.navigate(target); } catch (_) {}
      }
      if ("focus" in client) return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});
