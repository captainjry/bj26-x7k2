# Beijing 2026 trip site

Offline phone web app for the Beijing + Chongli trip, 7–14 Dec 2026. One trip only.
Live at `https://captainjry.github.io/bj26-x7k2/` (public repo `captainjry/bj26-x7k2`, published by `.github/workflows/pages.yml` on every push to `main`).

## Update the site after the sheet changes

1. Download her Google Sheet as `.xlsx` (File → Download → Microsoft Excel).
2. `python -I build.py "C:\Users\capta\Desktop\Beijing Trip Dec26.xlsx"` → rewrites `site/trip.json`, prints a warning for every cell text not found in `places.json`.
3. Add any warned place to `places.json`, re-run step 2.
4. Bump `APP_VERSION` in `site/sw.js`, commit, push. Phones show "Update available" next time they are online.

## Files

| File | Role |
|------|------|
| `build.py` | xlsx tab `A - as planned` → `site/trip.json` |
| `places.json` | Hand-curated: Chinese name + address per place, English note text. Keyed by place id. |
| `site/` | The published app (GitHub Pages root). `trip.json` is generated, never hand-edited. |

## Decisions (2026-11-11)

- Source = tab `A - as planned`. Her Google Sheet is the master; bookings and expenses stay in the sheet, not on the site.
- Phones: her iPhone 18 Pro (map button → Apple Maps), his Samsung S24+ (map button → Amap 高德, Google is blocked in China).
- UI labels English. Her cell text shown as she wrote it (Thai/English mix). Chinese appears ONLY on the "Show to driver" card (large name + address for taxi drivers). The users cannot read Chinese.
- Before 7 Dec the Today screen shows "Trip starts in N days" + Day 1. During the trip it auto-picks the day by Beijing date (Asia/Shanghai).
- Public link, `<meta name="robots" content="noindex">`, no booking refs, no passport data, no Trip.com email.
- Three.js snow scene: vendored locally (offline), paused when hidden, off under `prefers-reduced-motion`.
- First screen shows install steps: iPhone Share → Add to Home Screen; Samsung menu → Add to home screen. Open once online before flying.

## `site/trip.json` schema

```json
{
  "trip": { "title": "Beijing & Chongli", "start": "2026-12-07", "end": "2026-12-14", "tz": "Asia/Shanghai" },
  "tags": {
    "book":   { "label": "จอง",        "color": "#RRGGBB" },
    "food":   { "label": "อาหาร",      "color": "#RRGGBB" },
    "cafe":   { "label": "Cafe",       "color": "#RRGGBB" },
    "free":   { "label": "ไม่ต้องจอง",  "color": "#RRGGBB" },
    "travel": { "label": "เดินทาง",     "color": "#RRGGBB" }
  },
  "places": {
    "lama-temple": { "name": "Lama Temple", "name_zh": "雍和宫", "address_zh": "北京市东城区雍和宫大街12号", "city_zh": "北京" }
  },
  "hotels": [
    { "place": "crystal-orange", "from": "2026-12-07", "to": "2026-12-09" },
    { "place": "thaiwoo-nanshanli", "from": "2026-12-09", "to": "2026-12-11" },
    { "place": "crystal-orange", "from": "2026-12-11", "to": "2026-12-14" }
  ],
  "days": [
    {
      "date": "2026-12-07", "label": "Day 1 - Beijing",
      "items": [
        { "time": "09:00", "text": "Lama Temple", "tag": "book", "note": "Opens 9:00. Timed entry released 7 days ahead at midnight, book to be safe.", "place": "lama-temple" }
      ]
    }
  ]
}
```

- `text` = cell text exactly as in the sheet (newlines kept as `\n`).
- `note` = the cell note in English with Chinese stripped (Chinese lives in `places`). May be absent.
- `place` = id into `places`; absent for items with no location (e.g. "Ski Day", "Check out").
- `tag` = one of the `tags` keys, from the cell fill colour matched against the legend cells; absent if unfilled.
- `places.<id>.phone` = optional, hotels only (e.g. `"+86-10-85221688"`).
- An item's `place` is where a taxi takes you: travel items point at their destination (e.g. "Land PEK -> hotel" → `crystal-orange`, "Hotel ... -> Airport" → `pek`).
- `places.json` adds `match` (case/whitespace-insensitive substrings of cell text; the longest hit wins) and `note_en` (replaces the cell note of items at that place). Neither is copied into `trip.json`; places no cell uses are left out.
