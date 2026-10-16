/**
 * Captures review screenshots of the built site (run `npm run build` first).
 *   npm run screenshots                       -> full-page shots at the standard breakpoints into ./screenshots
 *   npm run screenshots -- --only=1440 --section=#explore --wait=1500
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { createAppServer } from '../../server/app';
import { loadConfig } from '../../server/config';
import { openWaitlistStore } from '../../server/db';

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? 'true']; }));
const SIZES: Record<string, [number, number]> = { '360': [360, 740], '390': [390, 844], '430': [430, 932], '768': [768, 1024], '1024': [1024, 768], '1366': [1366, 768], '1440': [1440, 900], '1920': [1920, 1080] };
const out = path.resolve('screenshots');
mkdirSync(out, { recursive: true });

const store = openWaitlistStore(':memory:');
const server = createAppServer(loadConfig({ WAITLIST_TOKEN_SECRET: 'shots' }, { staticDir: path.resolve('dist') }), store, { quiet: true });
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const wait = Number(args.wait ?? 900);
for (const [name, [w, h]] of Object.entries(SIZES)) {
  if (args.only && !String(args.only).split(',').includes(name)) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: args.reduced ? 'reduce' : 'no-preference', hasTouch: w < 800, isMobile: w < 800 });
  const page = await ctx.newPage();
  const problems: string[] = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[requestfailed] ${r.url()}`));
  await page.goto(base + (args.path ?? '/'), { waitUntil: 'networkidle' });
  // Trigger every reveal so full-page shots show final state.
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
  await page.waitForTimeout(wait);
  if (args.load3d) {
    const btn = page.locator('[data-load-3d]');
    await btn.scrollIntoViewIfNeeded();
    if (await btn.isVisible()) await btn.click();
    await page.waitForTimeout(Number(args.load3d) > 1 ? Number(args.load3d) : 4000);
    if (args.keys) {
      await page.locator('[data-viewer-mount]').focus();
      const [k, n] = String(args.keys).split('*');
      for (let i = 0; i < Number(n ?? 1); i++) await page.keyboard.press(k as string);
      await page.waitForTimeout(1500);
    }
    console.log('viewer state:', await page.evaluate(() => document.querySelector('[data-explore]')?.getAttribute('data-mode') ?? document.querySelector('.explore__stage')?.className));
  }
  if (args.each) {
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main > section, footer')).map((e, i) => e.id || `${e.tagName.toLowerCase()}${i}`));
    for (const id of ids) {
      const loc = page.locator(`main > section#${id}, footer`).first();
      const el = id.startsWith('footer') ? page.locator('footer').first() : page.locator(`#${id}`).first();
      void loc;
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(wait);
      await el.screenshot({ path: path.join(out, `${args.tag ?? 'sec'}-${name}-${id}.png`) });
    }
  } else if (args.section) {
    await page.locator(String(args.section)).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(wait);
    await page.locator(String(args.section)).first().screenshot({ path: path.join(out, `${args.tag ?? 'section'}-${name}.png`) });
  } else {
    await page.screenshot({ path: path.join(out, `${args.tag ?? 'page'}-${name}.png`), fullPage: !args.fold });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${name}px  horizontal overflow: ${overflow}px${problems.length ? '\n  ' + problems.join('\n  ') : ''}`);
  await ctx.close();
}
await browser.close();
server.close();
store.close();
