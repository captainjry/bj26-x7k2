import { localNow, todayState, nowAndNext, hotelTonight, mapUrl, nextStopPlace, checklistVisible, watchList } from './logic.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const icon = {
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  car: '<path d="M5 17h14M6 17v2M18 17v2M3 13l2-6a2 2 0 0 1 2-1.4h10A2 2 0 0 1 19 7l2 6v4H3z"/><circle cx="7.5" cy="14" r=".5"/><circle cx="16.5" cy="14" r=".5"/>',
  bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  id: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M15 9h3M15 13h3M5.5 17c.8-1.6 2-2.5 3.5-2.5s2.7.9 3.5 2.5"/>',
  alert: '<path d="m10.3 3.9-8.2 14A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-3.1l-8.2-14a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  sunset: '<path d="M12 10V2M4.2 10.2l1.4 1.4M18.4 11.6l1.4-1.4M2 18h2M20 18h2M17 18a5 5 0 0 0-10 0M22 22H2M16 6l-4 4-4-4"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icon[name]}</svg>`;

let T = null; // trip.json
let C = { phrases: null, sunset: null, checklist: null }; // site/content/*.json, each null if it failed to load
let route = null; // the WebGL scene, once it runs
let heroView = { day: null };

// ?today=2026-12-10&time=14:30 fakes the clock for testing.
function now() {
  const q = new URLSearchParams(location.search);
  const real = localNow(new Date(), T.trip.tz);
  const fakeDay = q.get('today');
  const fakeTime = q.get('time');
  const ymd = fakeDay || real.ymd;
  const minutes = fakeTime ? Number(fakeTime.slice(0, 2)) * 60 + Number(fakeTime.slice(3, 5)) : real.minutes;
  return { ymd, minutes };
}

// "Day 3 - Beijing -> Chongli" → { num: 3, place: "Beijing → Chongli" }
function splitLabel(label) {
  const m = /^Day\s*(\d+)\s*-\s*(.+)$/.exec(label || '');
  if (!m) return { num: null, place: label };
  return { num: Number(m[1]), place: m[2].replace(/\s*->\s*/g, ' → ') };
}

// Thumbnails: lazy, with intrinsic size so the card never jumps.
function thumb(photo, cls) {
  if (!photo) return '';
  return `<img class="${cls}" src="${esc(photo.file)}" width="${photo.w}" height="${photo.h}" alt="" loading="lazy" decoding="async">`;
}

function dayTitle(day) {
  const d = new Date(`${day.date}T12:00:00Z`);
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${weekday} ${date}`;
}

// ---------- pieces ----------
function placeButtons(placeId) {
  const place = T.places[placeId];
  if (!place) return '';
  const map = `<a class="btn" href="${esc(mapUrl(navigator.userAgent, place))}" target="_blank" rel="noopener">${svg('pin')}Map</a>`;
  const driver = `<button class="btn" data-driver="${esc(placeId)}">${svg('car')}Show to driver</button>`;
  return `<div class="actions">${map}${driver}</div>`;
}

// Consecutive stops at one place (car to Mutianyu, then the wall) show its photo once.
function itemHtml(item, i, items) {
  const samePlaceAsPrevious = i > 0 && items[i - 1].place === item.place;
  const photo = samePlaceAsPrevious ? null : T.places[item.place]?.photo;
  const tag = T.tags[item.tag];
  const tagHtml = tag ? `<span class="tag" style="--tag:${esc(tag.color)}"><i></i>${esc(tag.label)}</span>` : '';
  const note = item.note ? `<details><summary>Note</summary><p>${esc(item.note)}</p></details>` : '';
  return `<li class="item" data-i="${i}">
    <div class="time">${esc(item.time)}</div>
    <div class="card">
      ${thumb(photo, 'thumb')}
      <div class="card-body">
        <div class="badges"><span class="now-badge"></span>${tagHtml}</div>
        <p class="text">${esc(item.text)}</p>
        ${note}
        ${item.place ? placeButtons(item.place) : ''}
      </div>
    </div>
  </li>`;
}

function timeline(day) {
  return `<ol class="timeline">${day.items.map(itemHtml).join('')}</ol>`;
}

function hotelCard(ymd) {
  const hotel = hotelTonight(T.hotels, ymd);
  const place = hotel && T.places[hotel.place];
  if (!place) return '';
  const pic = place.photo ? thumb(place.photo, 'hotel-pic') : svg('bed');
  return `<section class="hotel">
    <div class="hotel-head">${pic}<div><p class="eyebrow">${svg('bed')}Hotel tonight</p><h2>${esc(place.name)}</h2></div></div>
    <div class="hotel-actions"><button class="btn primary big" data-driver="${esc(hotel.place)}">${svg('car')}Take me to the hotel</button>
    <a class="btn big" href="${esc(mapUrl(navigator.userAgent, place))}" target="_blank" rel="noopener">${svg('pin')}Map</a></div>
  </section>`;
}

// Driver card for the Next stop. markNow refills it, so it follows the clock without a re-render.
function nextStopHtml(day, minutes) {
  const placeId = nextStopPlace(day.items, minutes);
  const place = placeId && T.places[placeId];
  if (!place) return '';
  const item = day.items[nowAndNext(day.items, minutes).next];
  return `<section class="hotel next-stop">
    <p class="eyebrow">${svg('car')}Next stop · ${esc(item.time)}</p><h2>${esc(place.name)}</h2>
    <div class="hotel-actions"><button class="btn primary big" data-driver="${esc(placeId)}">${svg('car')}Take me there</button>
    <a class="btn big" href="${esc(mapUrl(navigator.userAgent, place))}" target="_blank" rel="noopener">${svg('pin')}Map</a></div>
  </section>`;
}

const WATCH_ICON = { passport: 'id', monday: 'alert', entry: 'clock', sunset: 'sunset' };
function watchHtml(day) {
  const list = watchList(day, T.places, C.sunset);
  if (!list.length) return '';
  const items = list.map((w) => `<li class="watch-${w.kind}">${svg(WATCH_ICON[w.kind])}${esc(w.text)}</li>`).join('');
  return `<section class="watch" aria-label="Bring and watch today"><p class="eyebrow">Bring &amp; watch</p><ul>${items}</ul></section>`;
}

function readTicks() {
  try { return JSON.parse(localStorage.getItem('bj26-checklist') || '{}'); } catch { return {}; }
}
const WHO = { both: 'Both phones', her: 'iPhone', him: 'Samsung' };
function checklistHtml() {
  if (!C.checklist) return '';
  const ticks = readTicks();
  const rows = C.checklist.items.map((it) => `<li><label class="check">
      <input type="checkbox" data-check="${esc(it.id)}"${ticks[it.id] ? ' checked' : ''}>
      <span>${esc(it.text)}<small>${esc(WHO[it.who] || it.who)}</small></span></label></li>`).join('');
  return `<h2 class="section">Before you fly</h2><ul class="checklist">${rows}</ul>`;
}

// Compares the service worker's precache list with what its cache really holds.
async function offlineCheck() {
  const el = $('#offline');
  if (!el) return;
  const sw = navigator.serviceWorker?.controller;
  if (!sw || !('caches' in window)) {
    el.className = 'offline bad';
    el.textContent = 'Not ready offline yet: open again with Wi-Fi';
    return;
  }
  try {
    const { files, cache } = await new Promise((resolve, reject) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = (e) => resolve(e.data);
      sw.postMessage('files', [ch.port2]);
      setTimeout(() => reject(new Error('no answer')), 3000);
    });
    const c = await caches.open(cache);
    const hits = await Promise.all(files.map((f) => c.match(new URL(f, location.href).href, { ignoreSearch: true })));
    const missing = hits.filter((h) => !h).length;
    el.className = missing ? 'offline bad' : 'offline ok';
    el.innerHTML = missing
      ? `Not ready: ${missing} of ${files.length} files missing. Open with Wi-Fi.`
      : `${svg('check')}Ready offline`;
  } catch {
    el.className = 'offline bad';
    el.textContent = 'Offline check failed: open again with Wi-Fi';
  }
}

function installHelp() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let dismissed = false;
  try { dismissed = localStorage.getItem('bj26-install-done') === '1'; } catch {}
  if (standalone || dismissed) return '';
  return `<section class="install">
    <button class="icon-btn" data-a="install-done" aria-label="Dismiss install help">${svg('x')}</button>
    <h2>Use it offline</h2>
    <p>Open once with internet before you fly, then add to home screen.</p>
    <p><b>iPhone:</b> Share → Add to Home Screen.<br><b>Samsung:</b> ⋮ menu → Add to home screen.</p>
  </section>`;
}

// size: 'tall' (Today), 'mid' (a day), 'short' (credits). The cover of the visible day loads eagerly.
// view: what the route scene frames, { day: index } or { day: null } for the whole trip.
function setHero(eyebrow, title, sub, cover, size, view) {
  $('#hero').dataset.size = size;
  heroView = view;
  route?.show(view);
  const img = $('#cover');
  if (cover) {
    if (img.getAttribute('src') !== cover.file) img.src = cover.file;
    img.alt = cover.alt || '';
  } else {
    img.removeAttribute('src');
    img.alt = '';
  }
  $('#hero-text').innerHTML = `<p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p>`;
}

function creditsLink() {
  return '<p class="credits-link"><a href="#credits">Photo credits</a></p>';
}

// ---------- screens ----------
function renderToday() {
  const { ymd } = now();
  const state = todayState(T.days, ymd);
  const day = T.days[state.dayIndex];
  const { place } = splitLabel(day.label);
  if (state.phase === 'before') {
    const n = state.daysUntil;
    const title = n === 1 ? 'Trip starts tomorrow' : `${n} days to go`;
    setHero(T.trip.title, title, `Day 1 · ${dayTitle(day)} · ${place}`, day.cover, 'tall', { day: null });
  } else if (state.phase === 'after') {
    setHero('Trip finished', place, `Last day · ${dayTitle(day)}`, day.cover, 'tall', { day: null });
  } else {
    setHero(`Today · Day ${state.dayIndex + 1} of ${T.days.length}`, place, dayTitle(day), day.cover, 'tall', { day: state.dayIndex });
  }
  const hotelDate = state.phase === 'before' ? T.trip.start : ymd;
  const heading = state.phase === 'during' ? 'Today' : state.phase === 'before' ? 'Day 1 plan' : 'Last day';
  const watch = state.phase === 'during' ? watchHtml(day) : '';
  const nextSlot = state.phase === 'during' ? '<div id="next-stop"></div>' : '';
  const checklist = checklistVisible(ymd, T.trip.start) ? checklistHtml() : '';
  $('#view').innerHTML = `${watch}${nextSlot}${hotelCard(hotelDate)}<p id="offline" class="offline">Checking offline files…</p>${installHelp()}
    ${checklist}<h2 class="section">${heading}</h2>${timeline(day)}${creditsLink()}`;
  markNow();
  offlineCheck();
}

// Highlight in place (no re-render, so open notes stay open).
function markNow() {
  const { ymd, minutes } = now();
  const state = todayState(T.days, ymd);
  if (state.phase !== 'during') return;
  const day = T.days[state.dayIndex];
  const { current, next } = nowAndNext(day.items, minutes);
  const slot = $('#next-stop');
  if (slot) slot.innerHTML = nextStopHtml(day, minutes);
  document.querySelectorAll('.item').forEach((li) => {
    const i = Number(li.dataset.i);
    const marked = i === current || i === next;
    // open the note once when the stop becomes Now/Next; after that the user's tap wins
    if (marked && !li.classList.contains('now') && !li.classList.contains('next')) {
      const details = li.querySelector('details');
      if (details) details.open = true;
    }
    li.classList.toggle('now', i === current);
    li.classList.toggle('next', i === next);
    li.querySelector('.now-badge').textContent = i === current ? 'Now' : i === next ? 'Next' : '';
  });
}

function renderDays(index) {
  const i = Math.min(Math.max(index, 0), T.days.length - 1);
  const day = T.days[i];
  setHero(`Day ${i + 1} of ${T.days.length} · ${dayTitle(day)}`, splitLabel(day.label).place, T.trip.title, day.cover, 'mid', { day: i });
  const strip = T.days.map((d, k) => {
    const dt = new Date(`${d.date}T12:00:00Z`);
    const wd = dt.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
    const current = k === i ? ' aria-current="true"' : '';
    return `<a href="#days/${k}"${current} aria-label="Day ${k + 1}, ${dayTitle(d)}"><small>${wd}</small><b>${dt.getUTCDate()}</b></a>`;
  }).join('');
  $('#view').innerHTML = `<nav class="strip" aria-label="Days">${strip}</nav>
    ${hotelCard(day.date)}<h2 class="section">Plan</h2>${timeline(day)}${creditsLink()}`;
}

// Phrase cards: they read en/th, staff read zh. Phrases marked "review" are left out until checked.
function readSize() {
  try { return localStorage.getItem('bj26-size') || ''; } catch { return ''; }
}
function renderPhrases() {
  setHero(T.trip.title, 'Phrases', 'Tap a card, then show the screen', null, 'short', { day: null });
  if (!C.phrases) {
    $('#view').innerHTML = '<p class="empty">Phrases did not load. Open once with internet.</p>';
    return;
  }
  const groups = C.phrases.groups.map((g) => {
    const cards = g.phrases.filter((p) => p.check !== 'review').map((p) => {
      if (!p.zh.includes('{size}')) {
        return `<li><button class="phrase" data-phrase="${esc(p.id)}"><b>${esc(p.en)}</b><span lang="th">${esc(p.th)}</span></button></li>`;
      }
      return `<li><div class="phrase slot">
        <b>${esc(p.en.replace('{size}', '…'))}</b><span lang="th">${esc(p.th.replace('{size}', '…'))}</span>
        <div class="slot-row"><label>Size <input type="text" inputmode="decimal" maxlength="5" data-size value="${esc(readSize())}" placeholder="42"></label>
        <button class="btn primary" data-phrase="${esc(p.id)}">Show</button></div>
      </div></li>`;
    }).join('');
    return `<h2 class="section">${esc(g.label)}</h2><ul class="phrases">${cards}</ul>`;
  }).join('');
  $('#view').innerHTML = groups;
}

// CC BY / BY-SA need author, licence and source next to the work they credit.
function renderCredits() {
  setHero(T.trip.title, 'Photo credits', 'Wikimedia Commons, free licences', null, 'short', { day: null });
  const rows = [];
  T.days.forEach((d, k) => { if (d.cover) rows.push({ use: `Day ${k + 1} cover`, photo: d.cover }); });
  Object.values(T.places).forEach((p) => { if (p.photo) rows.push({ use: p.name, photo: p.photo }); });
  const items = rows.map(({ use, photo }) => `<li class="credit">
      <img src="${esc(photo.thumb || photo.file)}" width="64" height="64" alt="" loading="lazy" decoding="async">
      <div><p class="credit-use">${esc(use)}${photo.standin ? ` <span class="standin">${esc(photo.standin)}</span>` : ''}</p>
      <p class="credit-by">${esc(photo.author)} · <a href="${esc(photo.license_url)}" target="_blank" rel="noopener">${esc(photo.license)}</a></p>
      <a class="credit-src" href="${esc(photo.source)}" target="_blank" rel="noopener">Source file</a></div>
    </li>`).join('');
  $('#view').innerHTML = `<p class="credits-intro">Photos from Wikimedia Commons, resized and cropped. Tap a licence or "Source file" for the original.</p><ul class="credits">${items}</ul>`;
}

function render() {
  const [tab, arg] = location.hash.slice(1).split('/');
  const isDays = tab === 'days';
  const current = isDays ? 'days' : tab === 'phrases' ? 'phrases' : 'today';
  document.querySelectorAll('#tabs a').forEach((a) => a.setAttribute('aria-current', String(a.dataset.tab === current)));
  if (tab === 'phrases') {
    renderPhrases();
  } else if (tab === 'credits') {
    renderCredits();
  } else if (isDays) {
    const fallback = todayState(T.days, now().ymd).dayIndex;
    renderDays(arg === undefined ? fallback : Number(arg));
  } else {
    renderToday();
  }
}

// ---------- driver card ----------
function openDriver(placeId) {
  const p = T.places[placeId];
  if (!p) return;
  const hotel = T.hotels.some((h) => h.place === placeId);
  const phone = p.phone ? `<p class="d-phone" lang="zh-Hans">${esc(p.phone)}</p>` : '';
  const el = $('#driver');
  el.innerHTML = `<div class="d-inner">
    <p class="d-ask" lang="zh-Hans">${hotel ? '请送我回酒店' : '请带我去这里'}</p>
    <p class="d-name" lang="zh-Hans">${esc(p.name_zh)}</p>
    <p class="d-addr" lang="zh-Hans">${esc(p.address_zh)}</p>
    ${phone}
    <p class="d-en">${esc(p.name)}</p>
    <button class="d-copy" data-copy="${esc(`${p.name_zh}\n${p.address_zh}`)}">${svg('copy')}<span>Copy Chinese for DiDi / Amap</span></button>
    <p class="d-close">Tap anywhere else to close</p>
  </div>`;
  el.hidden = false;
  el.focus();
}

function openPhrase(id) {
  const p = C.phrases?.groups.flatMap((g) => g.phrases).find((x) => x.id === id);
  if (!p) return;
  const size = readSize() || '…';
  const fill = (s) => s.replace('{size}', size);
  const el = $('#driver');
  el.innerHTML = `<div class="d-inner">
    <p class="d-name d-phrase" lang="zh-Hans">${esc(fill(p.zh))}</p>
    <p class="d-en">${esc(fill(p.en))}<br><span lang="th">${esc(fill(p.th))}</span></p>
    <p class="d-close">Tap anywhere to close</p>
  </div>`;
  el.hidden = false;
  el.focus();
}

async function copyChinese(btn) {
  const label = btn.querySelector('span');
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    btn.classList.add('done');
    label.textContent = 'Copied, paste it into DiDi or Amap';
  } catch {
    label.textContent = 'Copy failed: show this card instead';
  }
}
function closeDriver() { $('#driver').hidden = true; }

// ---------- service worker updates (pattern from gym-plan) ----------
let newSW = null;
let reloading = false;
function watchUpdates(reg) {
  const found = (w) => { if (w && navigator.serviceWorker.controller) { newSW = w; $('#update').hidden = false; } };
  found(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    w?.addEventListener('statechange', () => { if (w.state === 'installed') found(w); });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) location.reload(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
}

// ---------- route scene ----------
// The cover photo is the first paint and the whole fallback; the scene fades in over it, then the
// photo shrinks to a postcard. Lost context (iOS does this under memory pressure) puts the photo back.
function maybeRoute() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!document.createElement('canvas').getContext('webgl2')) return; // three r170 needs WebGL2
  import('./route.js').then((m) => {
    const hero = $('#hero');
    const scene = m.startRoute(hero, T);
    route = scene;
    scene.show(heroView);
    scene.canvas.addEventListener('webglcontextlost', () => {
      route = null;
      scene.canvas.remove();
      hero.classList.remove('gl');
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scene.canvas.classList.add('on');
      setTimeout(() => { if (route) hero.classList.add('gl'); }, 900);
    }));
  }).catch(() => {});
}

// ---------- boot ----------
document.addEventListener('click', (e) => {
  if (!$('#driver').hidden) {
    const copy = e.target.closest('[data-copy]');
    if (copy) copyChinese(copy); else closeDriver();
    return;
  }
  const t = e.target.closest('[data-driver],[data-a],[data-phrase]');
  if (!t) return;
  if (t.dataset.driver) openDriver(t.dataset.driver);
  if (t.dataset.phrase) openPhrase(t.dataset.phrase);
  if (t.dataset.a === 'install-done') {
    try { localStorage.setItem('bj26-install-done', '1'); } catch {}
    t.closest('.install').remove();
  }
  if (t.dataset.a === 'update' && newSW) { reloading = true; newSW.postMessage('skipWaiting'); }
});
document.addEventListener('change', (e) => {
  const box = e.target.closest('[data-check]');
  if (!box) return;
  const ticks = readTicks();
  ticks[box.dataset.check] = box.checked;
  try { localStorage.setItem('bj26-checklist', JSON.stringify(ticks)); } catch {}
});
document.addEventListener('input', (e) => {
  if (!e.target.matches('[data-size]')) return;
  try { localStorage.setItem('bj26-size', e.target.value.trim()); } catch {}
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDriver(); });
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && T) render(); });
setInterval(() => { if (T && !/^#(days|credits|phrases)/.test(location.hash)) markNow(); }, 60000);

// Extras are optional: the itinerary renders even if one of them fails to load.
const loadJson = (url) => fetch(url).then((r) => r.json());
const loadExtra = (url) => loadJson(url).catch(() => null);
Promise.all([loadJson('trip.json'), loadExtra('content/phrases.json'), loadExtra('content/sunset.json'), loadExtra('content/checklist.json')])
  .then(([trip, phrases, sunset, checklist]) => { T = trip; C = { phrases, sunset, checklist }; render(); maybeRoute(); })
  .catch(() => { $('#view').innerHTML = '<p class="empty">Could not load the trip. Open once with internet.</p>'; });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(watchUpdates).catch(() => {});
