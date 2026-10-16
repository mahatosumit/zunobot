/**
 * Honest, lab-only performance measurements against the production build served by the real server.
 * Not Lighthouse: no scoring, just LCP, CLS, long tasks, request count and transfer size, under
 * (a) an unthrottled desktop profile and (b) an emulated mid-range phone (4x CPU slowdown, ~1.6 Mbit/s, 150 ms RTT).
 * Numbers vary between runs and machines. Treat them as indicative; real-device and field data are still needed.
 *   npm run build && npx tsx tests/tools/perf.ts
 */
import { chromium, type CDPSession } from 'playwright';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { createAppServer } from '../../server/app';
import { loadConfig } from '../../server/config';
import { openWaitlistStore } from '../../server/db';

const store = openWaitlistStore(':memory:');
const server = createAppServer(loadConfig({ WAITLIST_TOKEN_SECRET: 'perf' }, { staticDir: path.resolve('dist') }), store, { quiet: true });
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

interface Profile { name: string; viewport: { width: number; height: number }; mobile: boolean; cpu: number; net?: { down: number; up: number; rtt: number } }
const profiles: Profile[] = [
  { name: 'desktop (no throttling)', viewport: { width: 1440, height: 900 }, mobile: false, cpu: 1 },
  { name: 'phone (4x CPU, 1.6 Mbit/s, 150 ms RTT)', viewport: { width: 390, height: 844 }, mobile: true, cpu: 4, net: { down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8, rtt: 150 } },
];

for (const p of profiles) {
  const runs: Array<Record<string, number>> = [];
  for (let i = 0; i < 3; i++) {
    const ctx = await browser.newContext({ viewport: p.viewport, isMobile: p.mobile, hasTouch: p.mobile, deviceScaleFactor: p.mobile ? 2 : 1 });
    const page = await ctx.newPage();
    const cdp: CDPSession = await ctx.newCDPSession(page);
    if (p.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
    if (p.net) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: p.net.down, uploadThroughput: p.net.up, latency: p.net.rtt }); }
    let bytes = 0; let reqs = 0; const js: string[] = [];
    await cdp.send('Network.enable');
    cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; reqs++; });
    cdp.on('Network.responseReceived', (e) => { if (e.type === 'Script') js.push(e.response.url); });
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__m = { lcp: 0, cls: 0, longTasks: 0, tbt: 0 };
      const m = (window as unknown as { __m: { lcp: number; cls: number; longTasks: number; tbt: number } }).__m;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) if (!e.hadRecentInput) m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { m.longTasks++; m.tbt += Math.max(0, e.duration - 50); } }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const m = await page.evaluate(() => ({ ...(window as unknown as { __m: Record<string, number> }).__m, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0 }));
    runs.push({ ...m, kB: bytes / 1024, reqs, jsFiles: js.length });
    await ctx.close();
  }
  const med = (k: string): number => { const v = runs.map((r) => r[k] as number).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] as number; };
  console.log(`\n${p.name}  (median of ${runs.length} cold loads)`);
  console.log(`  FCP ${med('fcp').toFixed(0)} ms | LCP ${med('lcp').toFixed(0)} ms | CLS ${med('cls').toFixed(3)} | long tasks ${med('longTasks')} (blocking ${med('tbt').toFixed(0)} ms)`);
  console.log(`  ${med('reqs')} requests, ${med('kB').toFixed(0)} kB transferred, ${med('jsFiles')} script file(s) (3D chunk not included: loaded on demand)`);
}
await browser.close();
server.close();
store.close();
