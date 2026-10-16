# ZunoBot website

Early-access website for **ZunoBot**, a home-robot concept built around **NAVIQ OS**. The one job of the site is to turn visitors into waitlist members while being exact about what is a design target and what is proven.

* Pre-rendered static HTML (TypeScript template functions, auto-escaped), one small hashed JS bundle, one hashed CSS file.
* A hand-written, dependency-free **WebGL2 viewer** loaded lazily for "Explore the Robot".
* A small **Node + SQLite waitlist API** (no third-party services, no credentials).
* No runtime dependencies at all. Dev dependencies: TypeScript, esbuild, tsx, Playwright.

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
src/client/viewer/   WebGL2 viewer (math, geometry, scene, renderer, index)
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

* The hero and gallery use the **real renders** (background-removed), because they are the most accurate depiction.
* "Explore the Robot" offers an **interactive stylised model** built procedurally from primitives (`src/client/viewer/scene.ts`). It is labelled "Stylised 3D model, not CAD" in the UI. Its proportions are approximate.
* **Nothing is animated as if validated.** The arms do not articulate, the head does not pan, the wheels do not drive. The camera moves; the robot does not. The "Articulated arms" copy says what the design intends and what is unproven.
* Behaviour: lazy-loaded chunk (about 8 kB gzipped) only on user request or on capable desktop devices; loading state; limited orbit (yaw and pitch clamps); drag, touch and keyboard (arrows, Home); auto-rotate that stops at the first interaction and can be paused; renders on demand and pauses when off-screen or the tab is hidden; adaptive resolution; WebGL context-loss handling; static poster fallback with retry; `prefers-reduced-motion` disables auto-rotation and focus tweens.
* **Swapping in a real model later:** implement the `ProductViewer` interface from `createViewer` in `src/client/viewer/index.ts` (for example with three.js and a glTF), keep the hotspot anchor contract (`onAnchors`), and update the badge text. The rest of the page does not change.

I chose a hand-written viewer over three.js because package registries were not reachable when this was built and the viewer is small; if you prefer three.js, the interface above is the seam.

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
