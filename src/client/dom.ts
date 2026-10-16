/** Small typed DOM helpers. */
export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => Array.from(root.querySelectorAll<T>(sel));

export const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Roving-tabindex arrow-key navigation for a tablist. `select` receives the newly chosen tab.
 * Horizontal lists use Left/Right; vertical lists use Up/Down. Home and End work in both.
 */
export function tabKeys(tabs: HTMLElement[], select: (tab: HTMLElement, focus: boolean) => void, vertical = false): void {
  const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
  const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
  tabs.forEach((tab, i) => {
    tab.addEventListener('keydown', (e) => {
      let to = -1;
      if (e.key === nextKey) to = (i + 1) % tabs.length;
      else if (e.key === prevKey) to = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = tabs.length - 1;
      if (to >= 0) {
        e.preventDefault();
        select(tabs[to] as HTMLElement, true);
      }
    });
  });
}
