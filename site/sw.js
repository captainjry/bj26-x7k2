// Bump APP_VERSION on every deploy → new shell cache → page shows "Update available".
const APP_VERSION = '1';
const SHELL = `bj26-shell-${APP_VERSION}`;
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'logic.js', 'snow.js', 'trip.json', 'manifest.webmanifest',
  'vendor/three.module.min.js', 'icons/icon-192.png', 'icons/icon-512.png'];

// No skipWaiting here: a new version waits until the user taps the update bar.
self.addEventListener('install', (e) => e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))) /* bypass HTTP cache (Pages max-age=600) */)));
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function cacheFirst(req) {
  const c = await caches.open(SHELL);
  const hit = await c.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
}

// trip.json is pinned to APP_VERSION too: a sheet update ships with a version bump (README step 4).
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;
  const r = req.mode === 'navigate' ? new Request('index.html') : req;
  e.respondWith(cacheFirst(r));
});
