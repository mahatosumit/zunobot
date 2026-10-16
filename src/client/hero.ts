import { $, prefersReducedMotion } from './dom';
import { canAutoLoad3D, hasWebGL2 } from './webgl';
import type { ProductViewer } from './viewer';

/**
 * Hero: gentle pointer parallax on the render, and on capable desktops a live 3D robot that cross-fades in
 * once its first frame is drawn. The render stays the LCP image and the fallback; nothing waits on WebGL.
 * The camera follows the pointer and turns as the hero scrolls away. The robot itself does not move.
 */
export function initHero(): void {
  const hero = $('.hero');
  const stage = $('[data-hero-stage]');
  if (!hero || !stage || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
  let raf = 0, px = 0, py = 0, visible = true;
  let viewer: ProductViewer | null = null;
  new IntersectionObserver((e) => { visible = e.some((x) => x.isIntersecting); }).observe(hero);
  hero.addEventListener('pointermove', (e) => {
    if (!visible || raf) return;
    const r = hero.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width) * 2 - 1;
    py = ((e.clientY - r.top) / r.height) * 2 - 1;
    raf = requestAnimationFrame(() => {
      raf = 0;
      hero.style.setProperty('--px', px.toFixed(3));
      hero.style.setProperty('--py', py.toFixed(3));
      viewer?.setLook(px, py);
    });
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--px', '0');
    hero.style.setProperty('--py', '0');
    viewer?.setLook(0, 0);
  });

  const mount = $('[data-hero-viewer]', hero);
  if (!mount || !canAutoLoad3D() || !hasWebGL2()) return;

  const onScroll = (): void => {
    if (!viewer) return;
    const r = hero.getBoundingClientRect();
    viewer.setProgress(Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.8))));
  };

  const start = async (): Promise<void> => {
    try {
      const { createViewer } = await import('./viewer');
      const caption = $('[data-hero-caption]', hero);
      viewer = createViewer(mount, {
        reducedMotion: false,
        mode: 'hero',
        onReady: () => {
          stage.classList.add('is-3d');
          if (caption) caption.textContent = 'Stylised 3D model, not CAD';
        },
        onLost: () => {
          viewer?.dispose();
          viewer = null;
          stage.classList.remove('is-3d');
          if (caption) caption.textContent = 'Design concept render';
        },
      });
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    } catch {
      // The render is already showing; the 3D view is an enhancement only.
    }
  };
  // Wait for the page (and its LCP image) to finish, then for an idle moment.
  const idle = (): void => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => { void start(); }, { timeout: 2000 });
    else window.setTimeout(() => { void start(); }, 300);
  };
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}
