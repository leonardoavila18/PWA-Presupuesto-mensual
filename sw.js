const CACHE_NAME = "v3_cache_gastos_financieros";
const urlsToCache = [
  "./",
  "./index.html",
  "./reporte-diario.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.json",
  "./img/Finance_icon.ico", 
  "./img/icons/Finance_icon_192x192.jpg",
  "./img/icons/Finance_icon_512x512.jpg", 
  "https://cdn.jsdelivr.net/npm/chart.js@3.9.1",
  "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
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
