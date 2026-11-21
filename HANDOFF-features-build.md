# Handoff: build the chosen features (after the WebGL redesign is live)

Written 2026-11-21. Start only after your redesign is merged, pushed and live. Then build on top of it, verify, and publish with the same rules as `HANDOFF-redesign-webgl.md` (commit by path, `type(scope): description`, merge to main, push, confirm the deploy, no force-push, owner reviews after publish).

## What to build

The owner picked these from `C:\Users\capta\workspace\beijing-2026-site\FEATURES-PROPOSAL.md` (read it; numbers match). **Not** #4 SOS.

1. **#1 Phrase cards** — a Phrases screen (bottom tab) with groups; tapping a card opens the existing full-screen show-to-staff style (big Chinese, small English/Thai). Data: `content/phrases.json` (shape documented in `HANDOFF-features-content.md`); a `{size}` placeholder in a phrase gets a small input before showing. Skip phrases with `check: "review"`.
2. **#2 Copy for DiDi / Amap / WeChat** — a "Copy Chinese" button on every driver card: `navigator.clipboard.writeText(name_zh + "\n" + address_zh)`, with a visible "Copied" state. Tapping the button must not close the card.
3. **#3 Take me to the next stop** — on Today, next to "Take me to the hotel", a button for the Next stop's place (hide when the next item has no place). Now and Next items show their note expanded.
4. **#5 Today: bring & watch strip** — at the top of Today: "Passports" when any of today's notes mentions passport **or** today has a train/Universal/ticketed sight (decide a small rule and document it), Monday closure warning (Forbidden City closed; Temple of Heaven halls closed), last-entry times found in today's notes, and today's sunset from `content/sunset.json` (Chongli on 9–11 Dec).
5. **#6 Offline-ready check** — compare the service worker cache with its precache list; show "Ready offline ✓" or "Not ready: N files missing — open with Wi-Fi".
6. **#7 Before-you-fly checklist** — shown until 7 Dec (Beijing date), ticks in localStorage per phone (wrap in try/catch), data `content/checklist.json`.

## Data plumbing

`content/*.json` is written by a separate content agent in the main checkout `C:\Users\capta\workspace\beijing-2026-site\content\`. Before you start, check those files exist and parse; if not, wait (re-check every few minutes) rather than inventing content. Copy them into your worktree (or have `build.py` merge them into `site/trip.json`, your call — keep `trip.json` generated, never hand-edited), precache everything, bump `APP_VERSION`, extend `test_build.py` / `site/test_logic.mjs` with small asserts for the new logic (strip rules, next-stop pick, checklist visibility by date).

## Verify

Same as the redesign: phone emulation 390×844 and 375×667, light/dark, `?today=` before / during / Monday 7 Dec / 14 Dec, no console errors, no horizontal scroll, works with WebGL off. Update the README Decisions section.
