import { $, $$ } from './dom';

/** Keeps the sticky visual in step with the feature currently centred in the viewport (desktop layout only). */
export function initFeatures(): void {
  const root = $('[data-features]');
  if (!root || !('IntersectionObserver' in window)) return;
  const items = $$('.feature', root);
  const layers = $$('.features__layer', root);
  const desktop = window.matchMedia('(min-width: 961px)');
  const set = (i: number): void => {
    items.forEach((el, n) => el.classList.toggle('is-active', n === i));
    layers.forEach((el, n) => el.classList.toggle('is-active', n === i));
  };
  const io = new IntersectionObserver((entries) => {
    if (!desktop.matches) return;
    for (const en of entries) if (en.isIntersecting) set(items.indexOf(en.target as HTMLElement));
  }, { rootMargin: '-45% 0px -45% 0px' });
  items.forEach((el) => io.observe(el));
  desktop.addEventListener('change', () => { if (!desktop.matches) items.forEach((el) => el.classList.add('is-active')); else set(0); });
}
