import { $, $$, tabKeys } from './dom';

/** Turns the three stacked product views into a tabbed viewer. Without JS all three stay visible. */
export function initGallery(): void {
  const root = $('[data-gallery]');
  const tablist = $('[data-gallery-tabs]');
  if (!root || !tablist) return;
  const tabs = $$<HTMLButtonElement>('[role="tab"]', tablist);
  const figs = $$<HTMLElement>('.gallery__fig', root);
  root.classList.add('is-enhanced');
  tablist.hidden = false;
  let current = 0;

  const select = (tab: HTMLElement, focus = false): void => {
    const next = tabs.indexOf(tab as HTMLButtonElement);
    if (next < 0 || next === current) { if (focus) tab.focus(); return; }
    tabs.forEach((t, i) => {
      t.setAttribute('aria-selected', String(i === next));
      t.tabIndex = i === next ? 0 : -1;
    });
    figs.forEach((f, i) => {
      f.classList.toggle('is-active', i === next);
      f.classList.toggle('is-before', i < next);
      // figures outside the active view are removed from the accessibility tree by visibility:hidden in CSS
    });
    // Make sure the lazily loaded image is requested immediately
    $<HTMLImageElement>('img', figs[next] as HTMLElement)?.setAttribute('loading', 'eager');
    current = next;
    if (focus) tab.focus();
  };
  tabs.forEach((t) => t.addEventListener('click', () => select(t)));
  tabKeys(tabs, select);
  figs.forEach((f, i) => f.classList.toggle('is-before', i < current));
}
