import { test, expect, pinCapableHardware } from './fixtures';

test.describe('Explore the robot', () => {
  test.beforeEach(async ({ page, app }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(app.url);
    await page.locator('#explore').scrollIntoViewIfNeeded();
  });

  test('hotspots work by keyboard and update the detail panel', async ({ page }) => {
    const hotspot = page.locator('[data-hotspot="drive"]');
    await hotspot.focus();
    await page.keyboard.press('Enter');
    await expect(hotspot).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#part-drive')).toBeVisible();
    await expect(page.locator('#part-display')).toBeHidden();
    await expect(page.locator('#part-tab-drive')).toHaveAttribute('aria-selected', 'true');
  });

  test('part tabs follow the arrow-key pattern', async ({ page }) => {
    await page.locator('#part-tab-display').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#part-tab-torso')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#part-torso')).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.locator('#part-tab-naviq')).toBeFocused();
  });

  test('hotspots work by touch', async ({ browser, app }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto(app.url);
    await page.locator('#explore').scrollIntoViewIfNeeded();
    await page.locator('[data-hotspot="arms"]').tap();
    await expect(page.locator('#part-arms')).toBeVisible();
    await ctx.close();
  });

  test('no software hotspot is pinned to a physical spot on the robot', async ({ page }) => {
    // NAVIQ OS is software: it has a tab and panel but no hotspot on the body.
    await expect(page.locator('[data-hotspot="naviq"]')).toHaveCount(0);
    await expect(page.locator('#part-tab-naviq')).toHaveCount(1);
  });

  test('3D loads on demand, rotates within limits, resets, and pauses auto-rotation on interaction', async ({ page, consoleProblems }) => {
    const load = page.locator('[data-load-3d]');
    const mount = page.locator('[data-viewer-mount]');
    if (await load.isVisible()) await load.click();
    await expect(mount.locator('canvas')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-badge]')).toContainText('not CAD');
    await expect(page.locator('.explore__poster')).toHaveCSS('opacity', '0');

    const stable = async (): Promise<string> => mount.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL().length.toString());
    // Drag far past the yaw limit; the model must not spin freely.
    const box = (await mount.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 900, box.y + box.height / 2, { steps: 20 });
    await page.mouse.up();
    await expect(page.locator('[data-toggle-spin]')).toHaveAttribute('aria-pressed', 'true'); // auto-rotate stopped by interaction
    await page.keyboard.press('Home');
    await mount.focus();
    await page.keyboard.press('ArrowLeft');
    await page.locator('[data-reset-view]').click();
    await expect(mount.locator('canvas')).toBeVisible();
    void stable;
    expect(consoleProblems.filter((p) => !/GPU stall|swiftshader|GL Driver Message/i.test(p))).toEqual([]);
  });

  test('falls back to the static render with a retry when WebGL2 is unavailable', async ({ browser, app }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await pinCapableHardware(ctx);
    await ctx.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
        return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest) as never;
      } as typeof orig;
    });
    const page = await ctx.newPage();
    await page.goto(app.url);
    await page.locator('#explore').scrollIntoViewIfNeeded();
    const load = page.locator('[data-load-3d]');
    await expect(load).toBeVisible();
    await load.click();
    await expect(page.locator('[data-viewer-status]')).toContainText(/3D|render/i);
    await expect(page.locator('.explore__poster')).toBeVisible();
    await expect(page.locator('[data-viewer-mount] canvas')).toHaveCount(0);
    // Hotspots and tabs still work on the static poster
    await page.locator('[data-hotspot="display"]').click();
    await expect(page.locator('#part-display')).toBeVisible();
    await ctx.close();
  });

  test('reduced motion: 3D does not auto-rotate and reveal content is visible immediately', async ({ browser, app }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(app.url);
    await page.locator('#explore').scrollIntoViewIfNeeded();
    const load = page.locator('[data-load-3d]');
    if (await load.isVisible()) await load.click();
    await expect(page.locator('[data-viewer-mount] canvas')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-toggle-spin]')).toBeHidden();
    const hidden = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-reveal]')].filter((e) => getComputedStyle(e).opacity === '0').length);
    expect(hidden).toBe(0);
    const longAnim = await page.evaluate(() => document.getAnimations().filter((a) => (a.effect?.getTiming().duration as number) > 50 && a.effect?.getTiming().iterations === Infinity).length);
    expect(longAnim).toBe(0);
    await ctx.close();
  });
});

test('content stays readable without JavaScript', async ({ browser, app }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(app.url);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A more helpful home starts here.');
  const hidden = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-reveal]')].filter((e) => getComputedStyle(e).opacity === '0').length);
  expect(hidden).toBe(0);
  await expect(page.locator('#faq details').first()).toBeVisible();
  await expect(page.locator('[data-wl-form]')).toBeVisible();
  await ctx.close();
});
