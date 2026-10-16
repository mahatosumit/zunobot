# ZunoBot website

Early-access website for **ZunoBot**, a home-robot concept built around **NAVIQ OS**. The one job of the site is to turn visitors into waitlist members while being exact about what is a design target and what is proven.

* Pre-rendered static HTML (TypeScript template functions, auto-escaped), one small hashed JS bundle, one hashed CSS file.
* A **three.js product viewer** (procedural stylised model, PBR studio lighting, contact shadows), lazy-loaded for the hero and for "Explore the Robot".
* A small **Node + SQLite waitlist API** (no third-party services, no credentials).
* One runtime dependency, `three` (pinned, bundled into the lazy 3D chunk only). Dev dependencies: TypeScript, esbuild, tsx, Playwright, `@types/three`.

## Quick start

Requires Node 22.13 or newer (24 recommended). `node:sqlite` is built in.

```bash
npm install
cp .env.example .env        # optional for local work
npm run dev                  # http://127.0.0.1:8787, rebuilds on change (reload the browser)
```

Production:

```bash
npm run build                # dist/ (site) + dist-server/index.mjs (API + static server)
WAITLIST_TOKEN_SECRET=<long random string> npm start
```

Or use the `Dockerfile` (mount a persistent volume at `/data`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run build` | Bundles, pre-renders, writes `robots.txt` (and `sitemap.xml` only when `SITE_URL` is set), prints a size report |
| `npm run typecheck` | Strict `tsc` for client, server and tests |
| `npm run lint` | Typecheck plus `scripts/claims-lint.ts` (banned claims, placeholders, unsafe logging, committed secrets) |
| `npm test` | Unit and API tests (`node:test`) |
| `npm run test:e2e` | Playwright browser tests against the real production build (needs `npm run build` first) |
| `npm run check:links` | Verifies internal links, anchors and assets in `dist/` |
| `npm run perf` | Lab measurements (LCP, CLS, long tasks, transfer) on desktop and an emulated phone |
| `npm run screenshots` | Review screenshots at 360 to 1920 px into `screenshots/` (`--load3d`, `--each`, `--section` options) |
| `npm run waitlist:export` | CSV of the waitlist to stdout (see "Waitlist data") |

## Layout

```
src/site/        page templates (layout, pages, sections/*), SEO + nav config
src/styles/      design tokens and per-section CSS
src/client/      progressive-enhancement "islands" (nav, reveal, gallery, explore, waitlist, ...)
src/client/viewer/   three.js viewer (robot.ts: procedural model; index.ts: renderer, lights, camera, interaction)
shared/          validation shared by browser and server
server/          http server, API, SQLite store, rate limiter, form tokens, security headers
scripts/         build, dev server, claims lint, link check, CSV export
tests/           unit, e2e, and tools (screenshots, perf)
tools/           asset pipeline (make-assets.py, make-fonts.sh) and source renders
docs/            CLAIMS.md (claims register), LAUNCH-CHECKLIST.md
```

## Configuration

See `.env.example`. Nothing secret is ever sent to the browser. Build-time values (`SITE_URL`, `CONTACT_EMAIL`) are public by nature. Until they are set the site deliberately omits canonical URL, `og:image`, `og:url`, sitemap and any contact line rather than inventing them.

## The 3D experience (and its limits)

There is no CAD or glTF model of ZunoBot in the project, only concept renders. So:

* The **real renders** (background-removed) are the first thing every visitor sees in the hero, and they drive the gallery, because they are the most accurate depiction. They are also the LCP image and the fallback for everything 3D.
* A **stylised 3D model** is built procedurally from three.js primitives in `src/client/viewer/robot.ts`, matched by eye to the front render (side and rear renders for depth and the back panel). It is labelled "Stylised 3D model, not CAD" wherever it appears. Its proportions are approximate.
* **Hero:** on capable desktops (wide viewport, fine pointer, at least 4 cores and 4 GB, no Save-Data, no reduced motion, WebGL2 present) the model loads after the page `load` event and an idle moment, then cross-fades over the render once its first frame is drawn. The camera eases toward the pointer and turns gently as the hero scrolls away. It is not interactive (`pointer-events: none`), so it never blocks the CTAs. Phones, reduced-motion users and devices without WebGL keep the render and never download the 3D chunk.
* **Explore the Robot:** the same model with drag, touch and keyboard orbit (arrows, Home) inside yaw and pitch limits, focus presets per part, and hotspots that track the model (`onAnchors`).
* **Nothing is animated as if validated.** The arms do not articulate, the head does not pan, the wheels do not drive. Only the camera moves (plus the display blinking). The "Articulated arms" copy says what the design intends and what is unproven.
* **Rendering:** physically based materials, a `RoomEnvironment` reflection map, a warm key light (the only shadow caster), a cool rim, a hemisphere fill, a shadow-catcher floor plus a soft contact blob. Because neither robot nor lights move, the shadow map is drawn once. Neutral tone mapping keeps the whites white.
* **Performance:** the 3D chunk is about 150 kB gzipped (three.js is most of it) and is never part of the initial load (main JS is about 6 kB gzipped). Frames render on demand only, pause off-screen and in hidden tabs, cap the pixel ratio (2, or 1.5 on touch), and drop resolution and shadow softness if the first 40 frames are slow. WebGL context loss falls back to the render (with retry in Explore).
* **Swapping in a real model later:** replace `buildRobot()` in `src/client/viewer/robot.ts` with a GLB loaded through three.js's `GLTFLoader`, keep the `anchors` it returns (hotspot positions), and update the badge text. `ProductViewer` in `src/client/viewer/index.ts` and the rest of the page do not change. Do not ship raw CAD assemblies; export a decimated, Draco/Meshopt-compressed GLB.

## Waitlist data

* **Flow:** the form fetches a signed, time-stamped token, then POSTs JSON to `/api/waitlist`. The server validates again, applies anti-abuse checks, and writes a row to SQLite. The success message appears only after the API replies `ok`, which happens only after the write (or for honeypot hits, see below).
* **Stored fields:** name, normalised email, optional country, interest and message, two separate opt-in flags (research invitations, development updates; both default unchecked), the consent-text version, created and updated timestamps, and a submission count.
* **Not stored or logged:** IP addresses, user agents, query strings, names, emails, messages. The request log is `METHOD /path status ms`. A salted HMAC of the IP lives in memory only, for rate limiting.
* **Duplicates:** the visitor always sees success, so the form cannot be used to discover who is on the list. The row is updated in place (original `created_at` kept, latest consent wins, blank optional fields do not erase earlier answers).
* **Anti-spam:** honeypot (looks like success, stores nothing), HMAC form token with a 2 s minimum and 6 h maximum age, per-client and global sliding-window rate limits, 8 KB body cap, JSON only, same-origin check. This is baseline protection, not CAPTCHA.
* **Location:** `WAITLIST_DB_PATH` (default `./data/waitlist.db`). Back it up and keep it on a persistent volume. Export with `npm run waitlist:export > waitlist.csv` (cells starting with `=`, `+`, `-`, `@` are neutralised for spreadsheet safety).
* **Not built (needs credentials or decisions):** confirmation emails, mailing-list sync, double opt-in. The success message says plainly that no confirmation email is sent yet.

## Verification summary

See the final report in the hand-off message. In short: `npm run lint`, `npm test`, `npm run test:e2e`, `npm run check:links` and `npm run build` all pass on the build machine. Limits of those checks are listed in `docs/LAUNCH-CHECKLIST.md`.
