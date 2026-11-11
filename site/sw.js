// Bump APP_VERSION on every deploy → new shell cache → page shows "Update available".
const APP_VERSION = '3';
// Every photo trip.json references (build.py output); offline means all of them, not just the ones viewed.
const IMAGES = [
  'img/16mm-cafe.webp', 'img/carbo.webp', 'img/cover-2026-12-07-sq.webp',
  'img/cover-2026-12-07.webp', 'img/cover-2026-12-08-sq.webp', 'img/cover-2026-12-08.webp',
  'img/cover-2026-12-09-sq.webp', 'img/cover-2026-12-09.webp', 'img/cover-2026-12-10-sq.webp',
  'img/cover-2026-12-10.webp', 'img/cover-2026-12-11-sq.webp', 'img/cover-2026-12-11.webp',
  'img/cover-2026-12-12-sq.webp', 'img/cover-2026-12-12.webp', 'img/cover-2026-12-13-sq.webp',
  'img/cover-2026-12-13.webp', 'img/cover-2026-12-14-sq.webp', 'img/cover-2026-12-14.webp',
  'img/crystal-orange.webp', 'img/fangzhuanchang-69.webp', 'img/feidachu.webp',
  'img/forbidden-city.webp', 'img/grandmas-home.webp', 'img/hu-teahouse-hotpot.webp',
  'img/jindingxuan.webp', 'img/lama-temple.webp', 'img/long-time-ago.webp',
  'img/mutianyu.webp', 'img/pek.webp', 'img/peking-chamber.webp',
  'img/qianmen-street.webp', 'img/qinghe-station.webp', 'img/sanlitun-taikoo-li.webp',
  'img/shuiguo-spa.webp', 'img/summer-palace.webp', 'img/temple-of-heaven.webp',
  'img/thaiwoo-nanshanli.webp', 'img/tiananmen-square.webp', 'img/universal-beijing.webp',
  'img/voyage-coffee.webp', 'img/wangfujing.webp',
];
const SHELL = `bj26-shell-${APP_VERSION}`;
const FILES = ['./', 'fonts/NotoSansThai-400-700-latin-ext.woff2', 'fonts/NotoSansThai-400-700-latin.woff2', 'fonts/NotoSansThai-400-700-thai.woff2', 'fonts/Prompt-600-latin-ext.woff2', 'fonts/Prompt-600-latin.woff2', 'fonts/Prompt-600-thai.woff2', 'fonts/Prompt-700-latin-ext.woff2', 'fonts/Prompt-700-latin.woff2', 'fonts/Prompt-700-thai.woff2', 'index.html', 'style.css', 'app.js', 'logic.js', 'snow.js', 'trip.json', 'manifest.webmanifest',
  'vendor/three.module.min.js', 'icons/icon-192.png', 'icons/icon-512.png', ...IMAGES];

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
