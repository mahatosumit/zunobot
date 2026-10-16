import { $, $$ } from './dom';

/** Accordion over the four architecture layers. One layer is open at a time. */
export function initNaviq(): void {
  const root = $('[data-naviq]');
  if (!root) return;
  const buttons = $$<HTMLButtonElement>('.layer__btn', root);
  const set = (btn: HTMLButtonElement, open: boolean): void => {
    btn.setAttribute('aria-expanded', String(open));
    const body = document.getElementById(btn.getAttribute('aria-controls') ?? '');
    if (body) body.hidden = !open;
    btn.closest('.layer')?.classList.toggle('is-open', open);
  };
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    const willOpen = btn.getAttribute('aria-expanded') !== 'true';
    buttons.forEach((b) => set(b, b === btn ? willOpen : false));
  }));
}
