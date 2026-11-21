# Handoff: content for the new trip-site features

Written 2026-11-21. Content only — write **no app code**, do not commit or push. A build agent will wire your files into the site later.

## Context

`C:\Users\capta\workspace\beijing-2026-site\` is an offline phone itinerary for a Thai couple's Beijing + Chongli trip, 7–14 Dec 2026 (read `README.md`). They read Thai and English, **cannot read Chinese**. Phones: her iPhone 18 Pro, his Samsung S24+. The owner chose features #1, #2, #3, #5, #6, #7 from `FEATURES-PROPOSAL.md` (read it). You produce the data for #1, #5 and #7. Everything must be bundled (offline, China: no runtime calls).

## Deliverables (in `C:\Users\capta\workspace\beijing-2026-site\content\`)

1. `phrases.json` — about 20 show-to-staff cards in groups: Food, Toilet, Tickets, Ski rental, Help. Shape:
   ```json
   { "groups": [ { "id": "food", "label": "Food", "phrases": [
     { "id": "not-spicy", "en": "Not spicy, please", "th": "ไม่เผ็ดนะ", "zh": "请不要辣", "back_en": "Please don't make it spicy", "check": "ok" } ] } ] }
   ```
   - `en`/`th` are the labels the couple reads; `zh` is what staff read (Simplified, natural, polite, short — how a local would say it on a sign/menu; no pinyin needed).
   - Include the ones in the proposal (not spicy, no coriander 香菜, "do you have pickled-cabbage fish 酸菜鱼?", where is the toilet, "we booked with this passport", beginner snowboard rental, boot size with a slot like "EU 42" → use a placeholder `{size}` the UI can fill, "please write the price", "can you take a photo of us?") plus what a first-time visitor in Beijing in December really needs (e.g. "two people", "the bill please", "can I pay with Alipay?", "is there a seated toilet?", "I'm allergic to …" only if useful). Ski phrases should fit Thaiwoo rental + lesson desks (beginner lesson, English-speaking instructor if possible).
   - Verify every `zh` by independent back-translation: translate it back to English without looking at `en` and store that in `back_en`; set `check` to `ok` or `review` with a one-line reason. Fix and recheck anything that drifts in meaning.
2. `sunset.json` — sunset (and sunrise) times for 7–14 Dec 2026 for Beijing and for Chongli/Taizicheng (≈ 40.9 N, 115.4 E), Asia/Shanghai, computed with a standard solar algorithm in a small Python script (stdlib only; keep the script as `content/sunset.py` so it can be re-run). Cross-check one date against timeanddate.com.
3. `checklist.json` — the before-you-fly setup list for feature #7, one item per line with `id`, `text` (English, short), `who` (`both` / `her` / `him`): Alipay with foreign card linked, WeChat installed (and WeChat Pay if possible), DiDi (or DiDi inside Alipay), Amap on the Samsung, offline translate (iPhone: Apple Translate Thai + Chinese downloaded; Samsung: Google Translate with Chinese + Thai offline packs — Google works offline even in China), eSIM / roaming that routes outside China, open the trip site online once + add to home screen, power bank, tissue packs / wet wipes, hand warmers. Add anything else that must be done before landing and is not a booking (bookings stay in the sheet). Keep it ≤ 14 items.

## Done when

The three JSON files (+ `sunset.py`) exist, parse, and every phrase has `check`. Report: file paths, count of phrases, any `review` items with reasons.
