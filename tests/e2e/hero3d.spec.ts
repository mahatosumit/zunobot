import { test, expect } from './fixtures';

const isGpuNoise = (p: string): boolean => /GPU stall|swiftshader|GL Driver Message/i.test(p);

test.describe('Hero 3D robot', () => {
  test('capable desktop: the 3D model cross-fades in over the render and is labelled as not CAD', async ({ page, app, consoleProblems }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(app.url);
    const stage = page.locator('[data-hero-stage]');
    await expect(stage).toHaveClass(/is-3d/, { timeout: 20_000 });
    await expect(page.locator('[data-hero-viewer] canvas')).toHaveCount(1);
    await expect(page.locator('[data-hero-caption]')).toHaveText('Stylised 3D model, not CAD');
    // The render stays in the document as the accessible description and the fallback.
    await expect(page.locator('.hero__img')).toHaveAttribute('alt', /ZunoBot concept render/);
    // The headline and primary CTA never wait on WebGL.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.hero__cta a[href="#waitlist"]')).toBeVisible();
    // Decorative only: it must not intercept clicks meant for the page.
    await expect(page.locator('[data-hero-viewer]')).toHaveCSS('pointer-events', 'none');
    expect(consoleProblems.filter((p) => !isGpuNoise(p))).toEqual([]);
  });

  test('phones keep the static render and never download the 3D chunk', async ({ browser, app }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const chunks: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/assets/chunks/')) chunks.push(r.url()); });
    await page.goto(app.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('.hero__img')).toBeVisible();
    await expect(page.locator('[data-hero-viewer] canvas')).toHaveCount(0);
    await expect(page.locator('[data-hero-caption]')).toHaveText('Design concept render');
    expect(chunks).toEqual([]);
    await ctx.close();
  });

  test('reduced motion keeps the static render in the hero', async ({ browser, app }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(app.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-hero-viewer] canvas')).toHaveCount(0);
    await expect(page.locator('[data-hero-stage]')).not.toHaveClass(/is-3d/);
    await ctx.close();
  });

  test('without WebGL the hero silently keeps the render', async ({ browser, app }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
        return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest) as never;
      } as typeof orig;
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(app.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('.hero__img')).toBeVisible();
    await expect(page.locator('[data-hero-viewer] canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
    await ctx.close();
  });
});
