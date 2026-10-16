import { test as base, expect } from 'playwright/test';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createAppServer } from '../../server/app';
import { loadConfig, type ServerConfig } from '../../server/config';
import { openWaitlistStore, type WaitlistStore } from '../../server/db';

export interface Harness { url: string; store: WaitlistStore; config: ServerConfig }

/** Each test gets its own server, in-memory database and rate-limit state, serving the real production build in dist/. */
export const test = base.extend<{ app: Harness; consoleProblems: string[] }>({
  app: async ({}, use) => {
    const dist = path.resolve('dist');
    if (!existsSync(path.join(dist, 'index.html'))) throw new Error('dist/ is missing. Run `npm run build` before the e2e tests.');
    const store = openWaitlistStore(':memory:');
    const config = loadConfig({ WAITLIST_TOKEN_SECRET: 'e2e-secret' }, { staticDir: dist });
    const server = createAppServer(config, store, { quiet: true });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    await use({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, store, config });
    await new Promise<void>((r) => server.close(() => r()));
    store.close();
  },
  consoleProblems: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`[${m.type()}] ${m.text()}`); });
    page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`[requestfailed] ${r.url()}`));
    await use(problems);
  },
});
export { expect };

export async function fillWaitlist(page: import('playwright/test').Page, v: { name?: string; email?: string; country?: string; interest?: string; message?: string; research?: boolean; marketing?: boolean } = {}): Promise<void> {
  const f = page.locator('[data-wl-form]');
  await f.locator('#wl-name').fill(v.name ?? 'Ada Lovelace');
  await f.locator('#wl-email').fill(v.email ?? 'ada@example.org');
  if (v.country) await f.locator('#wl-country').fill(v.country);
  if (v.interest) await f.locator('#wl-interest').selectOption(v.interest);
  if (v.message) await f.locator('#wl-message').fill(v.message);
  if (v.research) await f.locator('input[name=researchOptIn]').check();
  if (v.marketing) await f.locator('input[name=marketingOptIn]').check();
}
