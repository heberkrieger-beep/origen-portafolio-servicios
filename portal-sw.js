// Portal ORIGEN — service worker v1.0 · 2026-11-17
// Solo controla /portal*. Red primero; si no hay conexión, muestra la última copia guardada.
// Nunca guarda datos de Supabase (otro dominio): solo la página y los íconos.
const CACHE = 'origen-portal-v1';
const SHELL = ['/portal.html', '/portal-192.png', '/logo-origen.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }))
  );
});
