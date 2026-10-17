/* Service worker di Insubria Hub: riceve le notifiche push e tiene in cache la shell dell'app. */
const CACHE = "ih-shell-v3";
const SHELL = ["/", "/index.html", "/app.js", "/styles.css", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/badge-96.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // rete prima, cache come riserva: l'app resta apribile anche offline
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("/index.html"))));
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: "Insubria Hub", body: e.data && e.data.text() }; }
  const urgent = d.level === "urgente";
  e.waitUntil(Promise.all([
    // se l'app è aperta, la avvisiamo così aggiorna subito avvisi e domande
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => ws.forEach(w => w.postMessage({ type: "push", title: d.title, tag: d.tag }))),
    self.registration.showNotification(d.title || "Insubria Hub", {
      body: d.body || "",
      icon: d.icon || "/icons/icon-192.png",
      badge: d.badge || "/icons/badge-96.png",
      tag: d.tag,
      renotify: !!d.tag,
      requireInteraction: urgent,
      vibrate: urgent ? [200, 100, 200, 100, 400] : [120],
      data: { url: d.url || "/" },
    }),
    self.navigator && "setAppBadge" in self.navigator ? self.navigator.setAppBadge().catch(() => {}) : null,
  ]));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/", location.origin).href;
  e.waitUntil((async () => {
    const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const win = wins.find(w => new URL(w.url).origin === location.origin);
    if (win) { await win.focus(); win.postMessage({ type: "open", url }); return; }
    await clients.openWindow(url);
  })());
});

// il browser può rinnovare l'iscrizione: la riallineiamo con il server
self.addEventListener("pushsubscriptionchange", e => {
  e.waitUntil((async () => {
    const key = (await (await fetch("/api/push/key")).json()).key;
    const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - key.length % 4) % 4));
    const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) });
    await fetch("/api/push/subscribe", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "x-ih": "1" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
  })());
});
