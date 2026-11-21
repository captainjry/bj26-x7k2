# Handoff: a different 3D scene for each day

Written 2026-11-21. Start after APP_VERSION 7 (sharper photos) is published. Build, verify, publish with the same rules as `HANDOFF-redesign-webgl.md` (commit by path, `type(scope): description`, merge to `main`, push, confirm deploy, never force-push; owner reviews live, no need to ask).

## Owner feedback on v6

"This looks so much better." But every day shows the same snowboard animation copied from their talk; snowboarding only fits the Chongli ski days. They want other art on other days.

## Keep

Everything about v6's look: blue-hour palette, fog, warm alpenglow light, flat-shaded low-poly, camera-following snow, condensed display type, left panel on desktop, the day switch as a camera "shot". The world must feel like one film with different locations, not eight demos.

## Scenes (by Beijing date)

| When | Scene | Key motion |
|------|-------|------------|
| Before 7 Dec (countdown) | Keep the talk's title shot | as now |
| 7 Dec, Day 1 (hutongs, Nanluoguxiang, Tiananmen, Qianmen) | A grey-tiled hutong alley at night, rows of red lanterns, snow on roof ridges, a glowing gate at the end | camera glides down the alley, lanterns sway |
| 8 Dec, Day 2 (Universal Beijing) | Fireworks over a dark lake with reflections; generic, no branded rides or characters | bursts with reflected glow |
| 9 Dec, Day 3 (train to Chongli, first ski) | A white high-speed train racing through snowy hills toward mountains | train + parallax hills |
| 10 Dec, Day 4 (ski) | The current carving snowboarder | as now |
| 11 Dec, Day 5 (ski, train back, hot-spring spa) | Gondola cabins gliding over the valley at dusk, steam rising from an onsen pool | cabins on cable, steam particles |
| 12 Dec, Day 6 (Mutianyu Great Wall) | The Wall snaking over snowy ridges with watchtowers | camera flies along the wall |
| 13 Dec, Day 7 (Forbidden City, Summer Palace sunset) | Golden-tiled palace roofs in snow, then a frozen lake at sunset with a long arched bridge and small skaters | slow pan, skaters gliding |
| 14 Dec, Day 8 (Temple of Heaven, fly home) | The round triple-roofed temple at dawn, then a plane climbing into clouds | sunrise light, plane ascent |

Pick colours per scene within the palette (lantern red, palace gold, sunset orange) but keep the fog/blue-hour base so text contrast holds.

## Rules

- Procedural geometry only (three.js primitives, extrude, instancing). No downloaded 3D models or textures, nothing loaded at runtime from the network. Total added JS stays small (report KB).
- One scene alive at a time: build on day switch (or lazily), dispose geometries and materials of the previous one; cross-fade or cut through fog so switches feel like a slide change.
- Desktop: subject right of the panel (as `setViewOffset` does now). Phone: subject framed above the content.
- Keep the existing fallbacks and limits: reduced motion → slow or static frame, no WebGL → static gradient, loop paused when hidden or off screen, DPR ≤ 2, ≤ 30 fps idle on phones. Check the iPhone-class GPU budget: no shadows maps unless cheap, draw calls in the low hundreds.
- Respect cultural accuracy loosely (rooflines, wall crenellations, the round temple), but stylised is fine.

## Verify

Screenshot every scene at 390×844 and 1440×900 via `?today=2026-12-0N`, WebGL off, reduced motion. No console errors. Read the screenshots and fix ugly framing. Update README Decisions with the scene list.

## Report

One line per scene saying how it turned out, JS size added, precache total, anything you'd improve next.
