# Handoff: which features should the Beijing trip site add?

Written 2026-11-21. Trip starts 7 Dec 2026 (16 days away). Research and proposal only — **write no app code**.

## The question

The owner has a working itinerary site and is not sure what a great trip site should have. Find the features that would most help this couple on this trip, rank them, and hand back a short proposal the owner can pick from in two minutes.

## What exists (read these first)

- Live: `https://captainjry.github.io/bj26-x7k2/` (public repo `captainjry/bj26-x7k2`, `noindex`).
- Code: `C:\Users\capta\workspace\beijing-2026-site\`. Read `README.md` (decisions, data schema, update steps), then skim `site/app.js`, `site/trip.json`, `places.json`.
- Plan source: `C:\Users\capta\Desktop\Beijing Trip Dec26.xlsx`, tab `A - as planned` (8 days x hourly grid, 29 cell notes, colour legend, a "To book" list). Read it with `python -I` + openpyxl, `sys.stdout.reconfigure(encoding='utf-8')`.
- Current features: Today screen (auto day by Beijing date, Now/Next highlight, hotel tonight + "Take me to the hotel"), Days screen (8 days, timeline, cover photo per day, photo per stop, expandable notes), per stop Map button (Apple Maps on iPhone, Amap on Android) and "Show to driver" card (big Chinese name + address), Credits, install help, offline PWA, three.js snow over the cover.

## The trip and the people (constraints that decide what is useful)

- Couple from Thailand, Thai is their first language, read English, **cannot read Chinese**.
- Phones: her iPhone 18 Pro, his Samsung S24+. Used one-handed, outdoors, in -10 to -20 °C, often with gloves.
- 7 Dec land PEK 05:20 → Beijing 7–9 → train Qinghe → Taizicheng, ski at **Thaiwoo** resort, Chongli 9–11 (beginner snowboarders; she may take lessons) → Beijing 11–14 → fly TG 17:05 on 14 Dec.
- Hotels: Crystal Orange Sanlitun Taikoo Li (7–9, 11–14), Thaiwoo Town Nanshanli Hotel (9–11).
- China: Google, WhatsApp, Line, Google Maps are blocked without roaming/eSIM. Payments are Alipay/WeChat Pay. Taxis via DiDi. Many sights need passport + advance booking (Forbidden City, Tiananmen, Lama Temple).
- **Hard rules from the owner** (do not propose against these):
  - Expenses / budget tracking: dropped on purpose. Bookings tracking: stays in the sheet, not the site.
  - The site must work fully offline once installed; no runtime calls to Google or other blocked services. Any data must be bundled at build time.
  - Hosting stays static GitHub Pages (no backend, no database). Anything per-phone can use localStorage only.
  - Her Google Sheet stays the master for the plan; the site is generated from it by `build.py`.
  - Only this trip; no multi-trip features.

## What to do

1. Read the files above and use the live site on a phone-sized viewport.
2. Brainstorm broadly, then research what actually helps first-time foreign visitors in Beijing/Chongli in December: practical pain points (taxi, payment, toilets, cold, queues, closures on Mondays, passport checks, ski day logistics, airport day) and what good travel apps (Wanderlog, TripIt, Klook, Trip.com, Apple/Google trip features) offer. Use the web where it helps; cite sources for any fact you rely on.
3. For each candidate, judge against the constraints above. Drop anything that needs a backend, live data from blocked services, or Chinese reading.
4. Write `C:\Users\capta\workspace\beijing-2026-site\FEATURES-PROPOSAL.md`:
   - Top: a ranked table of **at most 8** features: name, one-line what it does on the phone, why it matters on *this* trip, effort (hours), data source (sheet / bundled / none).
   - Then **Recommended first 3** with a sentence each on why.
   - Then a short "Considered and dropped" list with the reason.
   - Plain language; the owner reads it on the go.
5. Do not edit anything else. Do not commit or push. Another agent is redesigning the visuals in a separate worktree at the same time — features should be described as behaviour, not visual style.

## Done when

`FEATURES-PROPOSAL.md` exists, follows the shape above, and every recommended feature respects every hard rule. Report its path and the top 3 in your last message.
