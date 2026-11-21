// Pure trip logic: no DOM, so test_logic.mjs can run it under node.

const DAY_MS = 86400000;

// Wall-clock date + minutes-since-midnight in the trip timezone.
export function localNow(date, tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  const ymd = `${get('year')}-${get('month')}-${get('day')}`;
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  return { ymd, minutes };
}

export function daysBetween(fromYmd, toYmd) {
  return Math.round((Date.parse(toYmd) - Date.parse(fromYmd)) / DAY_MS);
}

// Which day the Today screen shows.
export function todayState(days, ymd) {
  const first = days[0].date;
  const last = days[days.length - 1].date;
  if (ymd < first) {
    const daysUntil = daysBetween(ymd, first);
    return { phase: 'before', dayIndex: 0, daysUntil };
  }
  if (ymd > last) {
    const dayIndex = days.length - 1;
    return { phase: 'after', dayIndex, daysUntil: 0 };
  }
  const found = days.findIndex((d) => d.date === ymd);
  const dayIndex = found === -1 ? days.findLastIndex((d) => d.date < ymd) : found;
  return { phase: 'during', dayIndex, daysUntil: 0 };
}

// "09:00", "9.30", "09:00-11:00" → minutes of the first time; null when the cell has no time.
export function parseTime(time) {
  const m = /(\d{1,2})[:.](\d{2})/.exec(time || '');
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// current = last item already started, next = first item not yet started. Untimed items are skipped.
export function nowAndNext(items, minutes) {
  let current = -1;
  let next = -1;
  items.forEach((item, i) => {
    const t = parseTime(item.time);
    if (t === null) return;
    if (t <= minutes) current = i;
    else if (next === -1) next = i;
  });
  return { current, next };
}

// The night of `ymd` (from <= ymd < to). On the last morning (checkout day) the hotel just left
// is still the useful answer: luggage, "take me back".
export function hotelTonight(hotels, ymd) {
  const staying = hotels.find((h) => h.from <= ymd && ymd < h.to);
  if (staying) return staying;
  const checkingOut = hotels.find((h) => h.to === ymd);
  if (checkingOut) return checkingOut;
  return null;
}

// Google is blocked in China: Apple Maps on iPhone/iPad, Amap everywhere else.
export function isApple(ua) {
  return /iPhone|iPad|iPod|Macintosh/.test(ua); // iPadOS reports itself as Macintosh
}

export function mapUrl(ua, place) {
  const keyword = encodeURIComponent(place.name_zh);
  if (isApple(ua)) return `https://maps.apple.com/?q=${keyword}`;
  const city = encodeURIComponent(place.city_zh || '');
  return `https://uri.amap.com/search?keyword=${keyword}&city=${city}&src=bj26`;
}

// Driver-card place of the Next item, or null when there is none or it has no place.
export function nextStopPlace(items, minutes) {
  const { next } = nowAndNext(items, minutes);
  if (next === -1) return null;
  return items[next].place ?? null;
}

// The before-you-fly checklist shows until the trip's first Beijing date.
export function checklistVisible(ymd, startYmd) {
  return ymd < startYmd;
}

// "Bring & watch" for one day. Passports: a note says passport, or an item is a train or flight
// (stations and airports check ID). Last entry: "last entry HH:MM" in a note. Sunset: Chongli's
// table on days whose label names Chongli, Beijing's otherwise.
export function watchList(day, places, sunset) {
  const out = [];
  const passport = day.items.some((it) => /passport/i.test(it.note || '') || /\b(train|flight)\b/i.test(it.text || ''));
  if (passport) out.push({ kind: 'passport', text: 'Passports' });
  const weekday = new Date(`${day.date}T12:00:00Z`).getUTCDay();
  if (weekday === 1) out.push({ kind: 'monday', text: 'Monday: Forbidden City closed, Temple of Heaven halls closed' });
  day.items.forEach((it) => {
    const m = /last entry (\d{1,2}[:.]\d{2})/i.exec(it.note || '');
    if (!m) return;
    const where = places[it.place]?.name || it.text.split('\n')[0];
    out.push({ kind: 'entry', text: `Last entry ${m[1].replace('.', ':')} · ${where}` });
  });
  const table = sunset?.places?.[/chongli/i.test(day.label) ? 'chongli' : 'beijing'];
  const sun = table?.days.find((d) => d.date === day.date);
  if (sun) out.push({ kind: 'sunset', text: `Sunset ${sun.sunset}` });
  return out;
}
