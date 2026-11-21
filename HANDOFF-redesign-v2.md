# Handoff: redesign v2 — match the owner's snowboard talk, desktop-friendly, sharp images

Written 2026-11-21. Build, verify, publish (same publish rules as `HANDOFF-redesign-webgl.md`: commit by path, `type(scope): description`, merge to `main`, push, confirm deploy, never force-push; the owner reviews the live site, no need to ask first).

## Owner feedback on the live v5 (verbatim gist)

1. "The 3D route looks weird — I know what it's trying to do, but it just looks like a big mountain with a worm path."
2. "Even my presentation looks so much better than our site." → make the site look like it.
3. "Make it PC-friendly too — right now it's too focused on mobile."
4. "Image assets look not sharp."

## The reference: the owner's own talk

`C:\Users\capta\workspace\beijing-2026-site\reference\snowboard-talk.html` (git-ignored; do not commit it — it's the owner's private talk). Copied from their Mac. It loads three.js r128 from `three.min.js` with a cdnjs fallback, so open it locally (PC has internet) to see it live: `python -m http.server` in `reference/`, Chrome, and step through slides with →. `photo.jpg` was not copied; ignore the missing photo.

What makes it good (study the code, lines are short):
- **Atmosphere**: blue-hour night sky `#16233b`, matching `Fog(50, 230)`, hemisphere light + a warm low "alpenglow" directional light `#ffb38a`. Flat-shaded terrain, vertex colours snow↔rock by slope (`smooth(.62,.8,normal.y)`), peaks on the sides, a groomed run in the middle.
- **Life**: a small snowboard (extruded sidecut shape, orange top) carving S-turns down the run with a fading trail; 3,500 soft snowflakes that follow the camera.
- **Cinematography**: one camera "shot" per slide (follow / fixed vista / aerial), eased with `1 - exp(-dt*k)`; `setViewOffset` shifts the subject right of the text panel on wide screens.
- **Type & layout**: huge condensed uppercase display (`Big Shoulders Display` 900), mono eyebrows (`JetBrains Mono`, orange `#ff6a2b`, tracked caps), Inter body; text on a left gradient scrim like a lift-ticket panel; an `ALT 1,200 M` HUD + a thin orange progress bar.

## What to build

- Replace the "route over a big mountain" hero with the talk's world: blue-hour alpine valley, fog, alpenglow, snowboard carving with trail, camera-following snowfall. The day switch = a new camera shot (like a slide change), e.g. Beijing days a fixed dusk vista over the valley, Chongli ski days follow the rider, travel days an aerial. Keep it about *mood and motion*, not a literal map.
- Adopt the talk's design language across the app: the palette (night / snow / frost / glow orange / ice), condensed display headings for day titles and big numbers (countdown, times), mono eyebrows and HUD details (e.g. `DAY 06 / 08`, an altitude or temperature-style readout is fine as decoration), left scrim panel on desktop.
  - Fonts must be vendored woff2 (no Google Fonts at runtime: China + offline). Big Shoulders Display (900, maybe 700), JetBrains Mono (500), and keep **Noto Sans Thai** for body/Thai (the sheet text is Thai/English; Inter has no Thai) — Thai inside a condensed heading must still render well, test `Grandma's Home (ปลาต้มผักกาดดอง)` and `16 MM Cafe - Cafe ปลาคาร์ฟ`. Drop Prompt if it no longer fits. Subset to latin/latin-ext(/thai) like the current `site/fonts/`.
  - Dark is the native look (the talk is dark only). Light mode may stay as a calm daylight variant or be dropped in favour of dark only — your call, document it.
- **Desktop / PC layout** (≥ 900 px): the WebGL world full-bleed behind; a left panel (like the talk's scrim, ~40% width, max ~760 px) holding Today/Days/Phrases content, scrollable on its own; day switcher as a horizontal strip or keyboard ←/→ (like slides); hover/focus states; the driver and phrase cards as centred overlays, not full-width phone screens. Phone layout keeps everything usable one-handed as now.
- **Sharp images**: current stop photos are 480×320 and covers 960×1200 — blurry on 3× phones and PC. Re-fetch from the Commons `source` URLs recorded in `places.json` / `build.py` (`iiurlwidth`), emit `srcset` sizes (e.g. stop 640 / 1280 w, cover 1080 / 1920 w, WebP q≈75–80), `sizes` attributes that match the layout. Offline: precache the size each device actually uses is hard to predict — simplest robust option is precaching the larger size only and letting the browser downscale; keep total precache ≤ ~8 MB and report it. Where the Commons original is smaller than the target, keep the original width (no upscaling) and note it.
- Everything else stays: logic.js behaviour + tests, driver card + Copy Chinese, Map buttons, Phrases, Next stop, Bring & watch strip, offline-ready line, checklist, Credits (update for new image sizes), `?today=&time=`, install help, update bar, `noindex`, WebGL fallbacks (reduced motion / no WebGL → static dusk gradient, itinerary works the same), render loop paused when hidden, DPR ≤ 2, ≤ 30 fps idle on phones.

## Verify

Phone emulation 390×844 and 375×667, **desktop 1440×900 and 1920×1080**, `?today=` before / 7 Dec / 10 Dec (Chongli) / 14 Dec, WebGL off, no console errors, no horizontal scroll, images sharp at DPR 3 (check rendered vs natural size). Compare side by side with screenshots of the reference talk and say in the report how close it is. Update README Decisions.

## Report

Concept in 3–5 lines, live URL, precache size, image sizes chosen, any image that could not be sharpened, test results, what is still rough.
