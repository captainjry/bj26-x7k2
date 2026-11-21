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
| `places.json` | Hand-curated: Chinese name + address per place, English note text, `photo`. Keyed by place id. |
| `build.py` `COVERS` | Cover photo per trip date, copied into `days[].cover`. |
| `site/img/` | Processed photos referenced by `photo.file` / `photo.thumb`. |
| `site/` | The published app (GitHub Pages root). `trip.json` is generated, never hand-edited. |

## Decisions (2026-11-11)

- Source = tab `A - as planned`. Her Google Sheet is the master; bookings and expenses stay in the sheet, not on the site.
- Phones: her iPhone 18 Pro (map button → Apple Maps), his Samsung S24+ (map button → Amap 高德, Google is blocked in China).
- UI labels English. Her cell text shown as she wrote it (Thai/English mix). Chinese appears ONLY on the "Show to driver" card (large name + address for taxi drivers). The users cannot read Chinese.
- Before 7 Dec the Today screen shows "Trip starts in N days" + Day 1. During the trip it auto-picks the day by Beijing date (Asia/Shanghai).
- Public link, `<meta name="robots" content="noindex">`, no booking refs, no passport data, no Trip.com email.
- Look + world (2026-11-21, v6, `site/world.js`): the site now looks like the owner's own snowboard talk. Behind everything is the talk's blue-hour alpine valley (night sky `#16233b` with matching fog, alpenglow light, flat-shaded snow and rock, a groomed run) with an orange snowboard carving S-turns and leaving a trail, and snow falling around the camera. Each screen is a camera shot, like a slide change: Beijing days a fixed dusk vista over the valley, Chongli ski days follow the rider, travel days (`A -> B` in the label) an aerial, countdown the talk's title shot. It sets the mood and doesn't map the trip (v4's route map read as "a big mountain with a worm path").
  - Type and colour from the talk: Big Shoulders Display 900/700 uppercase for titles, times and big numbers; JetBrains Mono for eyebrows, tags and the HUD (`DAY 06 / 08`, `ALT 1,860 M` read from the camera height, a thin orange trip-progress bar on top); Noto Sans Thai for body text and for every Thai character (Big Shoulders has no Thai, so Thai inside a heading falls back to it). Palette: night / snow / frost / glow orange `#ff6a2b` / ice. Prompt is dropped.
  - Dark only, like the talk: one high-contrast theme (snow text on night is about 13:1). The show-to-driver and phrase cards stay black on white.
  - Desktop (>= 900 px): the world runs full-bleed behind; the content sits in a left panel (`min(760px, 46vw)`) on the talk's left scrim; the day's photo is a polaroid top-right with a mono caption; a HUD at the bottom right has ← / → day buttons and the keyboard arrows step days like slides; driver and phrase cards open as a centred white card. The phone layout is unchanged in function: world in the header, content sheet below, tabs at the bottom, photo as a small polaroid.
  - Rules: one renderer, DPR capped at 2, at most 30 fps, paused when the tab is hidden or the header canvas scrolls off (phone). Loads only with WebGL2 and without `prefers-reduced-motion`; otherwise, and on a lost context, the background is a static CSS dusk gradient and the itinerary works the same. Titles sit on their own >= 70% night scrim, never directly on the moving scene.
- Photos: Wikimedia Commons only (CC0 / public domain / CC BY / CC BY-SA), credited on the `#credits` screen. Restaurants and cafes with no free venue photo use a photo of their dish or category, marked `standin`. Stops at the same place back to back show its photo once.
- Images live in `site/img/` (WebP q70: stop thumbs 480×320, covers 960×1200 portrait plus a 160×160 square for the credits list), all precached by `site/sw.js` (`IMAGES`, kept equal to what `trip.json` references by `test_build.py`).
- First screen shows install steps: iPhone Share → Add to Home Screen; Samsung menu → Add to home screen. Open once online before flying.

## Features (2026-11-21, v5)

- **Phrases tab**: show-to-staff cards from `content/phrases.json`. Tap shows big Chinese full screen (same black-on-white card as the driver), with English + Thai under it. `{size}` phrases take a size typed on the card (kept per phone). Phrases with `"check": "review"` are hidden.
- **Copy Chinese** on every driver card: copies `name_zh` + newline + `address_zh` for pasting into DiDi / Amap / WeChat. The button shows "Copied"; tapping it does not close the card.
- **Next stop** (Today, during the trip): a card above the hotel with "Take me there" + Map for the Next item's place; hidden when that item has no place. Now and Next notes open by themselves once.
- **Bring & watch** (Today, during the trip), rules in `watchList` in `site/logic.js`: *Passports* when a note mentions passport or an item mentions a train or flight; a *Monday* warning (Forbidden City closed, Temple of Heaven halls closed); *Last entry HH:MM · place* from "last entry HH:MM" in a note; *Sunset* from `content/sunset.json`, Chongli's table on days whose label names Chongli. To make a stop show Passports, write "passport" in its sheet note.
- **Offline check** (Today): asks the service worker for its precache list and counts what is really in its cache: "Ready offline" or "Not ready: N of M files missing". The first visit says not ready, because the service worker only controls the page from the second open.
- **Before you fly** checklist (Today, until the Beijing date reaches 7 Dec): `content/checklist.json`, ticks kept per phone in localStorage.
- Content source is `content/` (written by hand / `python -I content/sunset.py`); the site reads the copies in `site/content/`. After editing: `cp content/*.json site/content/`, bump `APP_VERSION`. `test_build.py` fails if the copies differ.

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
- `places.<id>.photo` and `days[].cover` = photo object, copied as-is from `places.json` / `COVERS`:
  `{ "file": "img/lama-temple.webp", "w": 480, "h": 320, "title": "File:….jpg", "author": "xiquinhosilva", "license": "CC BY 2.0", "license_url": "https://creativecommons.org/licenses/by/2.0", "source": "https://commons.wikimedia.org/wiki/File:…" }`.
  Covers add `"thumb"` (square for the credits list) and `"alt"`. `"standin"` (optional) says what the photo shows when it is not the place itself, e.g. `"Peking duck, the dish"`.
  To change a photo: put the new WebP in `site/img/`, edit the object, add the path to `IMAGES` in `site/sw.js`, re-run `build.py` and `test_build.py`.
- An item's `place` is where a taxi takes you: travel items point at their destination (e.g. "Land PEK -> hotel" → `crystal-orange`, "Hotel ... -> Airport" → `pek`).
- `places.json` adds `match` (case/whitespace-insensitive substrings of cell text; the longest hit wins) and `note_en` (replaces the cell note of items at that place). Neither is copied into `trip.json`; places no cell uses are left out.
