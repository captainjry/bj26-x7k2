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
