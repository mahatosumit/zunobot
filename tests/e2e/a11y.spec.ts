import { test, expect } from './fixtures';

/** A compact accessibility audit. It complements, and does not replace, a manual screen-reader pass. */
test.describe('accessibility audit', () => {
  test('document structure: language, title, landmarks, one h1, no skipped heading levels, unique ids', async ({ page, app }) => {
    await page.goto(app.url);
    expect(await page.locator('html').getAttribute('lang')).toBeTruthy();
    expect((await page.title()).length).toBeGreaterThan(10);
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(1);
    await expect(page.locator('nav[aria-label]')).not.toHaveCount(0);
    await expect(page.locator('h1')).toHaveCount(1);
    const levels = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!, `heading jump at index ${i}`).toBeLessThanOrEqual(1);
    const dupes = await page.evaluate(() => { const seen = new Set<string>(); const d: string[] = []; document.querySelectorAll('[id]').forEach((e) => { if (seen.has(e.id)) d.push(e.id); seen.add(e.id); }); return d; });
    expect(dupes).toEqual([]);
  });

  test('images have alt text, controls have names, and ARIA references resolve', async ({ page, app }) => {
    await page.goto(app.url);
    const problems = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('img').forEach((i) => { if (!i.hasAttribute('alt')) out.push(`img without alt: ${i.getAttribute('src')}`); });
      document.querySelectorAll('button, a[href], [role=tab], summary').forEach((e) => {
        const el = e as HTMLElement;
        const name = (el.getAttribute('aria-label') || el.textContent || '').trim() || el.getAttribute('aria-labelledby');
        if (!name) out.push(`unnamed control: ${el.outerHTML.slice(0, 100)}`);
      });
      document.querySelectorAll('[aria-controls], [aria-labelledby], [aria-describedby]').forEach((e) => {
        for (const attr of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
          (e.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean).forEach((id) => { if (!document.getElementById(id)) out.push(`${attr} -> missing #${id}`); });
        }
      });
      document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]), select, textarea').forEach((e) => {
        const el = e as HTMLInputElement;
        if (el.closest('.hp')) return;
        if (!el.labels?.length && !el.getAttribute('aria-label')) out.push(`unlabelled field: ${el.name}`);
      });
      return out;
    });
    expect(problems).toEqual([]);
  });

  test('the honeypot field is hidden from assistive technology and the tab order', async ({ page, app }) => {
    await page.goto(app.url);
    const hp = page.locator('.hp');
    await expect(hp).toHaveAttribute('aria-hidden', 'true');
    await expect(hp.locator('input')).toHaveAttribute('tabindex', '-1');
  });

  test('every focusable element shows a visible focus indicator', async ({ page, app }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(app.url);
    const bad: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
        const shadow = cs.boxShadow !== 'none';
        return { ok: ring || shadow, tag: el.tagName + '.' + el.className };
      });
      if (r && !r.ok) bad.push(r.tag);
    }
    expect(bad).toEqual([]);
  });

  test('text contrast meets WCAG AA wherever the background is a flat colour', async ({ page, app }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(app.url);
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
    await page.waitForTimeout(800);
    const result = await page.evaluate(() => {
      const parse = (c: string): [number, number, number, number] | null => {
        const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
        const p = m[1]!.split(/[,\s/]+/).filter(Boolean).map(Number);
        return [p[0]!, p[1]!, p[2]!, p[3] ?? 1];
      };
      const lum = ([r, g, b]: number[]): number => { const f = (v: number): number => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!); };
      const bgOf = (el: Element): [number, number, number] | null => {
        let layers: Array<[number, number, number, number]> = [];
        for (let e: Element | null = el; e; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.backgroundImage !== 'none') return null; // gradients / images: not measurable here
          const c = parse(cs.backgroundColor);
          if (c && c[3] > 0) { layers.push(c); if (c[3] === 1) break; }
        }
        if (!layers.length) return null;
        let base: [number, number, number] = [8, 9, 11];
        for (const l of layers.reverse()) base = [0, 1, 2].map((i) => l[i]! * l[3] + base[i]! * (1 - l[3])) as [number, number, number];
        return base;
      };
      const fails: string[] = []; let checked = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set<Element>();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement; if (!el || seen.has(el) || !n.textContent?.trim()) continue;
        seen.add(el);
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0 || el.closest('[hidden], .sr-only, .skip-link')) continue;
        const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
        const bg = bgOf(el); if (!bg) continue;
        const fg = parse(cs.color); if (!fg) continue;
        const fgMixed = [0, 1, 2].map((i) => fg[i]! * fg[3] + bg[i]! * (1 - fg[3]));
        const L1 = lum(fgMixed) + 0.05, L2 = lum(bg) + 0.05;
        const ratio = Math.max(L1, L2) / Math.min(L1, L2);
        const size = parseFloat(cs.fontSize); const bold = Number(cs.fontWeight) >= 700;
        const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        checked++;
        if (ratio < need) fails.push(`${ratio.toFixed(2)} < ${need}: "${n.textContent!.trim().slice(0, 40)}" (${el.tagName}.${el.className})`);
      }
      return { checked, fails };
    });
    console.log(`contrast: ${result.checked} text elements measured on flat backgrounds`);
    expect(result.checked).toBeGreaterThan(50);
    expect(result.fails).toEqual([]);
  });

  test('interactive targets are at least 24x24 CSS pixels on mobile (WCAG 2.2 AA)', async ({ page, app }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(app.url);
    const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, a[href], summary, input:not([type=hidden]), select, textarea, [role=tab]')]
      .filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && !e.closest('[hidden], .hp, .sr-only') && cs.display !== 'inline'; })
      .map((e) => ({ r: ((e as HTMLInputElement).type === 'checkbox' ? (e.closest('label') ?? e) : e).getBoundingClientRect(), e }))
      .filter(({ r }) => r.width < 24 || r.height < 24)
      .map(({ e }) => e.outerHTML.slice(0, 90)));
    expect(small).toEqual([]);
  });
});
