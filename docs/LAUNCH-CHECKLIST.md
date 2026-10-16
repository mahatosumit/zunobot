# Launch checklist

Items marked **BLOCKED** need credentials, a decision or information this project could not invent.

## Must do before going public

- [ ] **Legal review of `/privacy`.** It is labelled "Draft status" and has not been reviewed by a lawyer. It currently says entries are kept "until you ask us to delete it or until the early-access programme ends". Confirm that retention policy (or change it) and update `CONSENT_VERSION` in `shared/waitlist.ts` if the consent wording changes. **BLOCKED: legal advice.**
- [ ] **Name the operator.** The privacy notice does not name a legal entity because none was provided. **BLOCKED: business information.**
- [ ] **Official contact address.** Set `CONTACT_EMAIL` at build time. Until then the privacy page says no contact address has been published and the form's error state offers no email. People cannot exercise data-access or deletion rights without one. **BLOCKED.**
- [ ] **Official domain.** Set `SITE_URL` at build time to enable canonical URL, `og:url`, `og:image` and `sitemap.xml`. **BLOCKED: domain not provided.**
- [ ] **Hosting with a persistent volume** for `WAITLIST_DB_PATH`. A container without a volume loses every registration on redeploy.
- [ ] **Set `WAITLIST_TOKEN_SECRET`** (long random string). Without it a random secret is generated per start and open forms stop validating after a restart.
- [ ] **Set `TRUST_PROXY=true` only behind a trusted reverse proxy** that overwrites `X-Forwarded-For`. Otherwise every visitor shares the proxy's address and rate limits.
- [ ] **TLS and HSTS** at the proxy or host (the app sets other security headers, not HSTS).
- [ ] **Owner sign-off on `docs/CLAIMS.md`**, especially the "needs owner confirmation" list.
- [ ] **Back-ups** of the SQLite file, and a deletion procedure for requests (delete the row; there is no admin UI).

## Strongly recommended

- [ ] Add a real bot challenge (for example Cloudflare Turnstile or hCaptcha) in front of the form if the site gets attention. The current honeypot, token and rate limits stop casual abuse only. **BLOCKED: requires an account and keys.**
- [ ] Confirmation email and double opt-in for marketing consent, and mailing-list sync. **BLOCKED: requires an email provider and credentials.** The success message currently says no confirmation email is sent.
- [ ] Re-check the V5 figures against CAD or a physical unit before they are stated as anything other than design targets.
- [ ] If a CAD or glTF model becomes available, replace `buildRobot()` with a compressed GLB (see README, "The 3D experience").
- [ ] Check the hero and Explore 3D on real hardware (an integrated-GPU laptop, a mid-range Android tablet, Safari on macOS). Here it was only rendered with SwiftShader (software GL) in headless Chromium.
- [ ] Do a manual pass with a screen reader (VoiceOver and NVDA). The automated audit here is not a substitute.
- [ ] Real-device performance run (mid-range Android and an older iPhone) and field monitoring. Numbers in the report are lab measurements.
- [ ] Rate limits are in memory, per process. Run a single instance, or move the limiter to a shared store before scaling out.

## What the checks do not cover

* No ESLint, axe-core, vitest or Lighthouse were available (package registries were unreachable). Equivalents used: strict `tsc`, `scripts/claims-lint.ts`, `node:test`, a hand-written Playwright accessibility audit (structure, names, labels, ARIA references, focus visibility, contrast on flat backgrounds, target size) and `tests/tools/perf.ts`.
* The contrast audit measures text on flat backgrounds only. Text over gradients or images (hero, waitlist background) was checked by eye in screenshots.
* Only Chromium was tested (with a software GL renderer). Safari and Firefox were not run.
* The Docker image has not been built here.
