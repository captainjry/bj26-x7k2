// Run: node site/test_logic.mjs
import assert from 'node:assert/strict';
import { localNow, todayState, parseTime, nowAndNext, hotelTonight, mapUrl } from './logic.js';

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

console.log('test_logic: all passed');
