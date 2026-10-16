import { $, $$ } from './dom';

export function initNav(): void {
  const nav = $('[data-nav]');
  const toggle = $<HTMLButtonElement>('[data-nav-toggle]');
  const panel = $('[data-nav-panel]');
  if (!nav || !toggle || !panel) return;

  // Solid-ish background once the page scrolls
  let ticking = false;
  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle('is-scrolled', window.scrollY > 12);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const focusables = (): HTMLElement[] => [toggle, ...$$<HTMLElement>('a[href], button', panel)];
  const setOpen = (open: boolean, returnFocus = true): void => {
    nav.classList.toggle('is-open', open);
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) ($<HTMLElement>('a', panel))?.focus();
    else if (returnFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => setOpen(panel.hasAttribute('hidden')));
  // Navigating from the panel closes it; the browser then scrolls to the section.
  $$('a', panel).forEach((a) => a.addEventListener('click', () => setOpen(false, false)));
  document.addEventListener('keydown', (e) => {
    if (panel.hasAttribute('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'Tab') {
      const items = focusables();
      const first = items[0] as HTMLElement, last = items[items.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (m) => { if (m.matches && !panel.hasAttribute('hidden')) setOpen(false, false); });

  // Mark the section currently in view in the desktop links
  const links = $$<HTMLAnchorElement>('.nav__links a');
  const targets = links.map((a) => ({ a, el: document.getElementById(a.hash.slice(1)) })).filter((t): t is { a: HTMLAnchorElement; el: HTMLElement } => t.el !== null);
  if (targets.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const hit = targets.find((t) => t.el === en.target);
        if (hit) { if (en.isIntersecting) hit.a.setAttribute('aria-current', 'true'); else hit.a.removeAttribute('aria-current'); }
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach((t) => io.observe(t.el));
  }
}
