import { test, expect, fillWaitlist } from './fixtures';

test.describe('waitlist form', () => {
  test('shows inline validation, focuses the first invalid field, and stores nothing', async ({ page, app }) => {
    await page.goto(app.url);
    const form = page.locator('[data-wl-form]');
    await form.getByRole('button', { name: /join the waitlist/i }).click();
    await expect(page.locator('#wl-name-err')).toBeVisible();
    await expect(page.locator('#wl-email-err')).toBeVisible();
    await expect(page.locator('#wl-name')).toBeFocused();
    await expect(page.locator('#wl-name')).toHaveAttribute('aria-invalid', 'true');

    await page.locator('#wl-name').fill('Ada');
    await expect(page.locator('#wl-name-err')).toBeHidden();
    await page.locator('#wl-email').fill('not-an-email');
    await page.locator('#wl-email').blur();
    await expect(page.locator('#wl-email-err')).toBeVisible();
    await page.locator('#wl-email').fill('ada@example.org');
    await expect(page.locator('#wl-email-err')).toBeHidden();
    expect(app.store.count()).toBe(0);
  });

  test('success appears only after the entry is really stored, with consent kept separate', async ({ page, app }) => {
    await page.goto(app.url);
    await fillWaitlist(page, { name: 'Ada Lovelace', email: 'Ada@Example.org ', country: 'United Kingdom', interest: 'research', message: 'Status cues.', research: true });
    await page.locator('[data-wl-submit]').click();
    await expect(page.locator('[data-wl-success]')).toBeVisible();
    await expect(page.locator('[data-wl-success]')).toBeFocused();
    await expect(page.locator('[data-wl-form]')).toBeHidden();

    const rows = app.store.all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: 'ada@example.org', name: 'Ada Lovelace', country: 'United Kingdom', interest: 'research', research_opt_in: 1, marketing_opt_in: 0 });
  });

  test('marketing consent is unchecked by default and only stored when ticked', async ({ page, app }) => {
    await page.goto(app.url);
    await expect(page.locator('input[name=marketingOptIn]')).not.toBeChecked();
    await expect(page.locator('input[name=researchOptIn]')).not.toBeChecked();
    await fillWaitlist(page, { marketing: true });
    await page.locator('[data-wl-submit]').click();
    await expect(page.locator('[data-wl-success]')).toBeVisible();
    expect(app.store.all()[0]?.marketing_opt_in).toBe(1);
  });

  test('duplicate sign-ups look identical to the visitor, keep one row, and keep the original place', async ({ page, app }) => {
    await page.goto(app.url);
    await fillWaitlist(page, { email: 'dup@example.org', message: 'first' });
    await page.locator('[data-wl-submit]').click();
    await expect(page.locator('[data-wl-success]')).toBeVisible();
    const first = app.store.all()[0]!;

    await page.locator('[data-wl-again]').click();
    await expect(page.locator('[data-wl-form]')).toBeVisible();
    await fillWaitlist(page, { name: 'Ada L', email: 'DUP@example.org', message: '' });
    await page.locator('[data-wl-submit]').click();
    await expect(page.locator('[data-wl-success]')).toBeVisible();

    const rows = app.store.all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.created_at).toBe(first.created_at);
    expect(rows[0]!.submissions).toBe(2);
    expect(rows[0]!.message).toBe('first'); // a blank optional field does not erase an earlier answer
  });

  test('a server failure keeps the answers and offers a recovery path; retry then succeeds', async ({ page, app }) => {
    await page.goto(app.url);
    await fillWaitlist(page, { name: 'Grace Hopper', email: 'grace@example.org', message: 'keep me' });
    let fail = true;
    await page.route('**/api/waitlist', async (route) => {
      if (route.request().method() === 'POST' && fail) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"status":"error"}' });
      return route.continue();
    });
    await page.locator('[data-wl-submit]').click();
    const alert = page.locator('[data-wl-alert]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('could not save');
    await expect(alert).toBeFocused();
    await expect(page.locator('#wl-message')).toHaveValue('keep me');
    await expect(page.locator('[data-wl-success]')).toBeHidden();
    expect(app.store.count()).toBe(0);
    await expect(page.locator('[data-wl-submit]')).toBeEnabled();

    fail = false;
    await page.locator('[data-wl-submit]').click();
    await expect(page.locator('[data-wl-success]')).toBeVisible();
    expect(app.store.count()).toBe(1);
  });

  test('a network failure is handled the same way', async ({ page, app }) => {
    await page.goto(app.url);
    await fillWaitlist(page);
    await page.route('**/api/waitlist', (route) => (route.request().method() === 'POST' ? route.abort('failed') : route.continue()));
    await page.locator('[data-wl-submit]').click();
    await expect(page.locator('[data-wl-alert]')).toContainText('could not save');
    await expect(page.locator('[data-wl-success]')).toBeHidden();
  });

  test('rate limiting is explained and nothing is claimed as saved', async ({ page, app }) => {
    await page.goto(app.url);
    await fillWaitlist(page);
    await page.route('**/api/waitlist', (route) => (route.request().method() === 'POST'
      ? route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ status: 'rate_limited', retryAfterSeconds: 300 }) })
      : route.continue()));
    await page.locator('[data-wl-submit]').click();
    await expect(page.locator('[data-wl-alert]')).toContainText('Too many attempts');
    await expect(page.locator('[data-wl-alert]')).toContainText('5 minutes');
    await expect(page.locator('[data-wl-success]')).toBeHidden();
  });

  test('the real server rate limit kicks in after repeated submissions from one client', async ({ page, app }) => {
    await page.goto(app.url);
    const token = (await (await page.request.get(`${app.url}/api/waitlist/token`)).json()).token as string;
    await page.waitForTimeout(2300);
    const statuses: number[] = [];
    for (let i = 0; i < app.config.submitLimit.max + 2; i++) {
      const res = await page.request.post(`${app.url}/api/waitlist`, { data: { name: 'Rate', email: `r${i}@example.org`, token, website: '' } });
      statuses.push(res.status());
    }
    expect(statuses.slice(0, app.config.submitLimit.max).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  test('the honeypot looks like success but stores nothing', async ({ page, app }) => {
    await page.goto(app.url);
    await fillWaitlist(page, { email: 'bot@example.org' });
    await page.locator('input[name=website]').evaluate((el: HTMLInputElement) => { el.value = 'http://spam.invalid'; });
    await page.locator('[data-wl-submit]').click();
    await expect(page.locator('[data-wl-success]')).toBeVisible();
    expect(app.store.count()).toBe(0);
  });

  test('a form posted without a valid token is refused', async ({ page, app }) => {
    const res = await page.request.post(`${app.url}/api/waitlist`, { data: { name: 'No Token', email: 'nt@example.org', token: 'forged', website: '' } });
    expect(res.status()).not.toBe(200);
    expect(app.store.count()).toBe(0);
  });

  test('can be completed with the keyboard alone', async ({ page, app }) => {
    await page.goto(app.url);
    await page.locator('#wl-name').focus();
    await page.keyboard.type('Keyboard User');
    await page.keyboard.press('Tab');
    await page.keyboard.type('keys@example.org');
    // Skip optional fields, then reach the submit button with Tab and press Enter
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      if (await page.locator('[data-wl-submit]').evaluate((el) => el === document.activeElement)) break;
    }
    await expect(page.locator('[data-wl-submit]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-wl-success]')).toBeVisible();
    expect(app.store.count()).toBe(1);
  });

  test('every field has a programmatic label and the privacy link works', async ({ page, app }) => {
    await page.goto(app.url);
    for (const id of ['wl-name', 'wl-email', 'wl-country', 'wl-interest', 'wl-message']) {
      const label = await page.locator(`label[for=${id}]`).count();
      expect(label, id).toBe(1);
    }
    await page.locator('[data-waitlist] a[href^="/privacy"]').first().click();
    await expect(page).toHaveURL(/\/privacy\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('server never writes visitor data to its log', async ({ page }) => {
    // Runs a dedicated server with a capturing logger.
    const { createAppServer } = await import('../../server/app');
    const { loadConfig } = await import('../../server/config');
    const { openWaitlistStore } = await import('../../server/db');
    const path = await import('node:path');
    const store = openWaitlistStore(':memory:');
    const lines: string[] = [];
    const orig = console.log;
    console.log = (...a: unknown[]) => { lines.push(a.join(' ')); };
    const server = createAppServer(loadConfig({ WAITLIST_TOKEN_SECRET: 's' }, { staticDir: path.resolve('dist') }), store);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as import('node:net').AddressInfo).port;
    try {
      const token = (await (await page.request.get(`http://127.0.0.1:${port}/api/waitlist/token?probe=secret@leak.test`)).json()).token as string;
      await page.waitForTimeout(2300);
      await page.request.post(`http://127.0.0.1:${port}/api/waitlist`, { data: { name: 'Leaky Name', email: 'leaky@private.test', token, website: '' } });
    } finally {
      console.log = orig;
      await new Promise<void>((r) => server.close(() => r()));
      store.close();
    }
    const joined = lines.join('\n');
    expect(joined).toContain('POST /api/waitlist');
    for (const secret of ['leaky@private.test', 'Leaky Name', 'secret@leak.test', '127.0.0.1', 'probe=']) expect(joined).not.toContain(secret);
  });
});
