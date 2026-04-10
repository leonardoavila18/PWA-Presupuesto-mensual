const CACHE_NAME = "v2_cache_gastos_financieros";
const urlsToCache = [
  "./",
  "./index.html",
  "./reporte-diario.html",
  "./css/style.css",
  "./js/app.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  const cacheWhitelist = [CACHE_NAME];
  e.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches
      .match(e.request)
      .then((res) => {
        if (res) return res;
        return fetch(e.request);
      })
      .catch(() => {
        if (e.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      }),
  );
});
