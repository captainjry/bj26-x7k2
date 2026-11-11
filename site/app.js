import { localNow, todayState, nowAndNext, hotelTonight, mapUrl } from './logic.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const icon = {
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  car: '<path d="M5 17h14M6 17v2M18 17v2M3 13l2-6a2 2 0 0 1 2-1.4h10A2 2 0 0 1 19 7l2 6v4H3z"/><circle cx="7.5" cy="14" r=".5"/><circle cx="16.5" cy="14" r=".5"/>',
  bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icon[name]}</svg>`;

let T = null; // trip.json

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
function setHero(eyebrow, title, sub, cover, size) {
  $('#hero').dataset.size = size;
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
    setHero(T.trip.title, title, `Day 1 · ${dayTitle(day)} · ${place}`, day.cover, 'tall');
  } else if (state.phase === 'after') {
    setHero('Trip finished', place, `Last day · ${dayTitle(day)}`, day.cover, 'tall');
  } else {
    setHero(`Today · Day ${state.dayIndex + 1} of ${T.days.length}`, place, dayTitle(day), day.cover, 'tall');
  }
  const hotelDate = state.phase === 'before' ? T.trip.start : ymd;
  const heading = state.phase === 'during' ? 'Today' : state.phase === 'before' ? 'Day 1 plan' : 'Last day';
  $('#view').innerHTML = `${hotelCard(hotelDate)}${installHelp()}
    <h2 class="section">${heading}</h2>${timeline(day)}${creditsLink()}`;
  markNow();
}

// Highlight in place (no re-render, so open notes stay open).
function markNow() {
  const { ymd, minutes } = now();
  const state = todayState(T.days, ymd);
  if (state.phase !== 'during') return;
  const day = T.days[state.dayIndex];
  const { current, next } = nowAndNext(day.items, minutes);
  document.querySelectorAll('.item').forEach((li) => {
    const i = Number(li.dataset.i);
    li.classList.toggle('now', i === current);
    li.classList.toggle('next', i === next);
    li.querySelector('.now-badge').textContent = i === current ? 'Now' : i === next ? 'Next' : '';
  });
}

function renderDays(index) {
  const i = Math.min(Math.max(index, 0), T.days.length - 1);
  const day = T.days[i];
  setHero(`Day ${i + 1} of ${T.days.length} · ${dayTitle(day)}`, splitLabel(day.label).place, T.trip.title, day.cover, 'mid');
  const strip = T.days.map((d, k) => {
    const dt = new Date(`${d.date}T12:00:00Z`);
    const wd = dt.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
    const current = k === i ? ' aria-current="true"' : '';
    return `<a href="#days/${k}"${current} aria-label="Day ${k + 1}, ${dayTitle(d)}"><small>${wd}</small><b>${dt.getUTCDate()}</b></a>`;
  }).join('');
  $('#view').innerHTML = `<nav class="strip" aria-label="Days">${strip}</nav>
    ${hotelCard(day.date)}<h2 class="section">Plan</h2>${timeline(day)}${creditsLink()}`;
}

// CC BY / BY-SA need author, licence and source next to the work they credit.
function renderCredits() {
  setHero(T.trip.title, 'Photo credits', 'Wikimedia Commons, free licences', null, 'short');
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
  document.querySelectorAll('#tabs a').forEach((a) => a.setAttribute('aria-current', String(a.dataset.tab === (isDays ? 'days' : 'today'))));
  if (tab === 'credits') {
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
    <p class="d-close">Tap anywhere to close</p>
  </div>`;
  el.hidden = false;
  el.focus();
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

// ---------- snow ----------
function maybeSnow() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return; // CSS gradient stays
  import('./snow.js').then((m) => m.startSnow($('#hero'))).catch(() => {});
}

// ---------- boot ----------
document.addEventListener('click', (e) => {
  if (!$('#driver').hidden) { closeDriver(); return; }
  const t = e.target.closest('[data-driver],[data-a]');
  if (!t) return;
  if (t.dataset.driver) openDriver(t.dataset.driver);
  if (t.dataset.a === 'install-done') {
    try { localStorage.setItem('bj26-install-done', '1'); } catch {}
    t.closest('.install').remove();
  }
  if (t.dataset.a === 'update' && newSW) { reloading = true; newSW.postMessage('skipWaiting'); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDriver(); });
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && T) render(); });
setInterval(() => { if (T && !location.hash.startsWith('#days') && !location.hash.startsWith('#credits')) markNow(); }, 60000);

fetch('trip.json')
  .then((r) => r.json())
  .then((json) => { T = json; render(); maybeSnow(); })
  .catch(() => { $('#view').innerHTML = '<p class="empty">Could not load the trip. Open once with internet.</p>'; });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(watchUpdates).catch(() => {});
