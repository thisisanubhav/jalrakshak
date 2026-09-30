const CACHE = "jalrakshak-shell-v1";
const SHELL = ["/", "/manifest.webmanifest"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); } return response; }).catch(async () => { const hit = await caches.match(event.request); if (hit) return hit; if (event.request.mode === "navigate") return (await caches.match("/")) || Response.error(); return Response.error(); }));
});
