const CACHE = "teza-admin-shell-v1";
const SHELL = ["/", "/login", "/manifest.webmanifest", "/teza-tech-lab-logo.svg"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || event.request.url.includes("firestore.googleapis.com")) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok && new URL(event.request.url).origin === location.origin) caches.open(CACHE).then(cache => cache.put(event.request, response.clone())); return response; }).catch(() => cached)));
});
