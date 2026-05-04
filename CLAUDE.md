# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend:** No build step. All apps are static HTML — open in browser or deploy directly to GitHub Pages.

**Export server (Render.com):**
```
cd export-server
npm install
npm start        # runs server.js on default port
```

**Deploy:** `git push origin main` — GitHub Pages auto-deploys to `alchemyaural.com` via CNAME.

## Architecture

**Static multi-app site.** Each app is a self-contained `<app>/index.html` with all logic inline. No framework, no bundler, no shared JS modules beyond two small shared scripts.

**Shared resources** (root level, used by all pages):
- `style.css` — CSS variables, nav, footer, card/button primitives. All apps `<link>` to `/style.css`.
- `nav.js` — Mobile hamburger toggle + active link highlighting.
- `gate.js` — License key gate. Hides `#aa-app-content` and injects a key-entry modal until `localStorage[tool.storage] === 'unlocked'`. Applied to frequency-generator and midi-generator (paid); breathwork uses it as free gate. Video-generator has no gate.

**Apps:**
- `frequency-generator/` — Web Audio API: binaural beats, isochronic tones, pure tones. Zero dependencies.
- `breathwork/` — 25+ breathing patterns with synthesized sounds. Zero dependencies.
- `midi-generator/` — Browser MIDI chord generator, downloadable.
- `video-generator/` — Ambient video loop creator (see below — most complex app).
- `music/`, `shop/` — Static content pages linking to Spotify/Gumroad.

## Video Generator Architecture

The most complex app. All logic is in `video-generator/index.html` (~1900 lines inline JS).

**External services:**
- **Pexels proxy:** `https://white-cloud-27a9.nanomarche.workers.dev` — Cloudflare Worker that adds Pexels API auth and CORS headers. Query params: `query`, `per_page`, `orientation`, `page`. Returns `{ videos: [...] }`.
- **Export server:** `https://aural-alchemy-export.onrender.com/export` — Node.js/FFmpeg on Render. Accepts POST with clip settings, polls `/status/:jobId`, emails MP4 download link.

**Three loop modes (set by `loopMode` variable):**
- `crossfade` — Two `<video>` elements (`activeVid` / `standbyVid`) blend on a `<canvas>` via `globalAlpha`. Uses static/ambient Pexels queries.
- `pendulum` — Single `<video>` (`pendVid`) scrubbed manually to play forward then backward via `requestAnimationFrame`. Uses motion/drone queries. Pre-buffers the loop region before starting.
- `smartloop` — Runs `findBestLoopPoints()` (frame-similarity scan using a 16×9 offscreen canvas) to find the most visually similar start/end frames, then runs as crossfade. Uses static queries.

**Key state variables:** `running`, `loopMode`, `loopIn`, `loopOut`, `activeVid`, `standbyVid`, `pendVid`, `manualPaused`, `currentClip`, `clipPool`.

**Session lifecycle:** `startSession()` → `fetchPool()` (if new theme/mode) → `startCrossfade()` / `startPendulum()` / `startSmartLoop()` → tick loop via `requestAnimationFrame` → `stopCleanup()` on stop/restart.

**`getQuery()`** returns different Pexels search strings depending on mode: crossfade and smartloop use `entry.cf` (static shots); pendulum uses `entry.pend` (motion shots). Each theme has a `THEMES` entry with both query variants.

**Settings changes** call `restartOnSettingChange()` which debounces 500ms before calling `stopCleanup()` + `startSession()`.

**Pause** (`togglePlayPause`): pauses `pendVid` (pendulum) or `activeVid` + `standbyVid` (crossfade/smartloop). `manualPaused` flag prevents tick loop from advancing.

**Canvas rendering:**
- Crossfade: `dissolveCtx` draws outgoing at `globalAlpha=1` then incoming at `globalAlpha=t` (source-over blend sums to full brightness — never darkens).
- Effects (zoom, mirror, kaleidoscope) applied via canvas transforms per frame.
- `pendCanvas` overlays `pendVid` with effects; has `pointer-events:none` to not block UI.

## CSS Conventions

- Dark theme variables defined in `style.css :root` — always use `var(--teal)`, `var(--gold)`, `var(--bg2)` etc. Never hardcode colors.
- `pointer-events: none` is required on all `::before` / `::after` pseudo-elements that are purely decorative — omitting it blocks clicks on the parent.
- App-specific styles go in a `<style>` block inside the app's `index.html`, never in `style.css`.

## HyperFrames (planned)

The repo has the `heygen-com/hyperframes` Claude Code skill installed. Long-term plan is to add a HyperFrames export path to video-generator (generate a `.html` composition from current loop settings + audio, render via CLI). Keep existing UI and loop logic intact — HyperFrames is an export layer, not a replacement for the live canvas preview.
