import { $$, prefersReducedMotion } from './dom';

/** Scroll-triggered reveals. CSS only hides [data-reveal] when scripting is enabled, with a time-based failsafe. */
export function initReveal(): void {
  const items = $$('[data-reveal]');
  if (!items.length) return;
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}
