// Run: node site/test_logic.mjs
import assert from 'node:assert/strict';
import { localNow, todayState, parseTime, nowAndNext, hotelTonight, mapUrl, nextStopPlace, checklistVisible, watchList } from './logic.js';

const days = ['07', '08', '09', '10', '11', '12', '13', '14'].map((d) => ({ date: `2026-12-${d}` }));

// 2026-12-06 17:30 UTC is already 01:30 on the 7th in Beijing.
assert.deepEqual(localNow(new Date('2026-12-06T17:30:00Z'), 'Asia/Shanghai'), { ymd: '2026-12-07', minutes: 90 });

assert.deepEqual(todayState(days, '2026-11-11'), { phase: 'before', dayIndex: 0, daysUntil: 26 });
assert.deepEqual(todayState(days, '2026-12-10'), { phase: 'during', dayIndex: 3, daysUntil: 0 });
assert.deepEqual(todayState(days, '2026-12-14'), { phase: 'during', dayIndex: 7, daysUntil: 0 });
assert.deepEqual(todayState(days, '2026-12-20'), { phase: 'after', dayIndex: 7, daysUntil: 0 });

assert.equal(parseTime('09:00'), 540);
assert.equal(parseTime('13.30 - 15:00'), 810);
assert.equal(parseTime(''), null);
assert.equal(parseTime(undefined), null);

const items = [{ time: '09:00' }, { text: 'Ski Day' }, { time: '12:00' }, { time: '18:00' }];
assert.deepEqual(nowAndNext(items, 8 * 60), { current: -1, next: 0 });
assert.deepEqual(nowAndNext(items, 13 * 60), { current: 2, next: 3 });
assert.deepEqual(nowAndNext(items, 23 * 60), { current: 3, next: -1 });

const hotels = [
  { place: 'crystal-orange', from: '2026-12-07', to: '2026-12-09' },
  { place: 'thaiwoo', from: '2026-12-09', to: '2026-12-11' },
  { place: 'crystal-orange', from: '2026-12-11', to: '2026-12-14' },
];
assert.equal(hotelTonight(hotels, '2026-12-08').place, 'crystal-orange');
assert.equal(hotelTonight(hotels, '2026-12-09').place, 'thaiwoo');
assert.equal(hotelTonight(hotels, '2026-12-14').place, 'crystal-orange');
assert.equal(hotelTonight(hotels, '2026-12-20'), null);

const place = { name_zh: '雍和宫', city_zh: '北京' };
const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15';
const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15';
const samsung = 'Mozilla/5.0 (Linux; Android 16; SM-S926B) AppleWebKit/537.36 SamsungBrowser/29.0 Chrome/136 Mobile Safari/537.36';
assert.equal(mapUrl(iphone, place), 'https://maps.apple.com/?q=%E9%9B%8D%E5%92%8C%E5%AE%AB');
assert.equal(mapUrl(ipad, place), 'https://maps.apple.com/?q=%E9%9B%8D%E5%92%8C%E5%AE%AB');
assert.equal(mapUrl(samsung, place), 'https://uri.amap.com/search?keyword=%E9%9B%8D%E5%92%8C%E5%AE%AB&city=%E5%8C%97%E4%BA%AC&src=bj26');

// Next stop: the Next item's place; null when it has none or the day is over.
const stops = [{ time: '09:00', place: 'a' }, { time: '11:00', text: 'Ski Day' }, { time: '13:00', place: 'b' }];
assert.equal(nextStopPlace(stops, 8 * 60), 'a');
assert.equal(nextStopPlace(stops, 10 * 60), null);
assert.equal(nextStopPlace(stops, 12 * 60), 'b');
assert.equal(nextStopPlace(stops, 14 * 60), null);

assert.equal(checklistVisible('2026-12-06', '2026-12-07'), true);
assert.equal(checklistVisible('2026-12-07', '2026-12-07'), false);

const sunset = { places: {
  beijing: { days: [{ date: '2026-12-07', sunset: '16:49' }, { date: '2026-12-10', sunset: '16:49' }] },
  chongli: { days: [{ date: '2026-12-10', sunset: '16:50' }] },
} };
const kinds = (w) => w.map((x) => x.kind);
// Monday 7 Dec, passport in a note, Beijing sunset
const mon = { date: '2026-12-07', label: 'Day 1 - Beijing', items: [{ text: 'Tian an men', note: 'ID type Passport' }] };
assert.deepEqual(kinds(watchList(mon, {}, sunset)), ['passport', 'monday', 'sunset']);
assert.equal(watchList(mon, {}, sunset)[2].text, 'Sunset 16:49');
// a train needs passports even without the word; Chongli days use Chongli's sunset
const ski = { date: '2026-12-10', label: 'Day 4 - Chongli', items: [{ text: 'Train -> Chongli' }] };
assert.deepEqual(watchList(ski, {}, sunset).map((x) => x.text), ['Passports', 'Sunset 16:50']);
// last entry, named by its place
const fc = { date: '2026-12-13', label: 'Day 7 - Beijing', items: [{ text: 'FC', place: 'fc', note: 'Opens 08:30, last entry 15:30, closed Mondays.' }] };
assert.deepEqual(watchList(fc, { fc: { name: 'Forbidden City' } }, sunset).map((x) => x.text), ['Last entry 15:30 · Forbidden City']);

console.log('test_logic: all passed');
