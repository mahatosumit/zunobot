import { test, expect } from './fixtures';

const NAV = ['Product', 'NAVIQ OS', 'Use Cases', 'Our Approach', 'FAQ'];

test.describe('navigation and structure', () => {
  test('desktop nav lists the required links and the waitlist CTA, and all of them scroll to real sections', async ({ page, app }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(app.url);
    const nav = page.locator('.nav__links');
    for (const label of NAV) await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Join the Waitlist' })).toBeVisible();
    for (const label of NAV) {
      const link = nav.getByRole('link', { name: label, exact: true });
      const hash = (await link.getAttribute('href'))!.split('#')[1]!;
      await link.click();
      await expect(page).toHaveURL(new RegExp(`#${hash}$`));
      await expect(page.locator(`#${hash}`)).toBeInViewport({ ratio: 0.05 });
    }
  });

  test('every in-page link on the page resolves to an element', async ({ page, app }) => {
    await page.goto(app.url);
    const missing = await page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"], a[href^="/#"]')]
      .map((a) => a.getAttribute('href')!.replace(/^\//, ''))
      .filter((h) => h.length > 1 && !document.getElementById(h.slice(1))));
    expect(missing).toEqual([]);
  });

  test('every waitlist CTA leads to the form, which is then reachable', async ({ page, app }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(app.url);
    const hrefs = await page.locator('a[href$="#waitlist"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    await page.locator('.hero a[href$="#waitlist"]').first().click();
    await expect(page.locator('#waitlist')).toBeInViewport({ ratio: 0.1 });
    await expect(page.locator('#wl-name')).toBeVisible();
  });

  test('mobile menu opens, traps focus, closes with Escape and returns focus', async ({ page, app }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(app.url);
    const toggle = page.locator('[data-nav-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-nav-panel]')).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[data-nav-panel], [data-nav-toggle]'));
      expect(inside).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-nav-panel]')).toBeHidden();
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.locator('[data-nav-panel]').getByRole('link', { name: 'FAQ' }).click();
    await expect(page.locator('[data-nav-panel]')).toBeHidden();
    await expect(page.locator('#faq')).toBeInViewport({ ratio: 0.05 });
  });

  test('skip link is off-screen until focused and then works', async ({ page, app }) => {
    await page.goto(app.url);
    const skip = page.locator('.skip-link');
    const box = await skip.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(0);
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await expect.poll(async () => (await skip.boundingBox())!.y).toBeGreaterThanOrEqual(0); // allow the slide-in transition to finish
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('FAQ has the ten specified questions and opens one at a time', async ({ page, app }) => {
    await page.goto(app.url);
    const items = page.locator('#faq details');
    await expect(items).toHaveCount(10);
    await items.nth(0).locator('summary').click();
    await expect(items.nth(0)).toHaveAttribute('open', '');
    await items.nth(1).locator('summary').click();
    await expect(items.nth(1)).toHaveAttribute('open', '');
    await expect(items.nth(0)).not.toHaveAttribute('open', '');
  });

  test('privacy page and 404 page render and link home', async ({ page, app }) => {
    await page.goto(`${app.url}/privacy/`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/waitlist handles your details/i);
    await expect(page.getByText(/draft/i).first()).toBeVisible();
    const res = await page.goto(`${app.url}/definitely-missing`);
    expect(res!.status()).toBe(404);
    await expect(page.getByRole('link', { name: /home|back/i }).first()).toBeVisible();
  });

  test('footer shows the current year and no invented contact details', async ({ page, app }) => {
    await page.goto(app.url);
    const footer = page.locator('footer');
    await expect(footer).toContainText(String(new Date().getFullYear()));
    await expect(footer.locator('a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0);
    await expect(footer.locator('a[href*="twitter.com"], a[href*="x.com"], a[href*="linkedin.com"], a[href*="instagram.com"], a[href*="facebook.com"], a[href*="youtube.com"]')).toHaveCount(0);
  });

  test('page loads with a clean console at desktop and mobile widths', async ({ page, app, consoleProblems }) => {
    for (const [w, h] of [[1440, 900], [390, 844]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(app.url, { waitUntil: 'networkidle' });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
    }
    expect(consoleProblems).toEqual([]);
  });

  test('no horizontal overflow at the required widths', async ({ page, app }) => {
    for (const w of [360, 390, 430, 768, 1024, 1366, 1440, 1920]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(app.url, { waitUntil: 'networkidle' });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `${w}px`).toBeLessThanOrEqual(0);
    }
  });

  test('security headers are present', async ({ page, app }) => {
    const res = await page.request.get(app.url);
    const h = res.headers();
    expect(h['content-security-policy']).toContain("script-src 'self'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBeTruthy();
    expect(h['x-frame-options'] ?? h['content-security-policy']).toBeTruthy();
  });
});
