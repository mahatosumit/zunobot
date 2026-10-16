import { $, prefersReducedMotion } from './dom';

/** Gentle pointer parallax on the hero (fine pointers only, never under reduced motion). */
export function initHero(): void {
  const hero = $('.hero');
  const stage = $('[data-hero-stage]');
  if (!hero || !stage || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
  let raf = 0, px = 0, py = 0, visible = true;
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
    });
  });
  hero.addEventListener('pointerleave', () => { hero.style.setProperty('--px', '0'); hero.style.setProperty('--py', '0'); });
}
