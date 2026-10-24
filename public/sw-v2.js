const CACHE = "jalrakshak-shell-v12";
const SHELL = [
  "/",
  "/personal",
  "/manifest.webmanifest",
  "/maplibre/maplibre-gl-worker.mjs",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await cache.addAll(SHELL);
        // The initial document may load before this worker controls the page.
        // Precache its local JS/CSS so the first offline refresh can boot.
        const documents = await Promise.all(["/", "/personal"].map(async path => (await cache.match(path)).text()));
        const html = documents.join(" ");
        const assets = [...new Set(html.match(/\/_next\/static\/[^"\s<>]+?\.(?:js|css)/g) || [])];
        await cache.addAll(assets);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("jalrakshak-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Cross-origin map tiles are intentionally network-only. Returning the app
  // shell for a missing tile or module would make the map fail with an invalid
  // MIME type instead of allowing the UI's offline fallback to appear.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(url.pathname, copy)));
          }
          return response;
        })
        .catch(async () => (await caches.match(url.pathname)) || Response.error()),
    );
    return;
  }

  const cacheable = ["style", "script", "worker", "image", "font"].includes(
    request.destination,
  );
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
          }
          return response;
        }),
    ),
  );
});
