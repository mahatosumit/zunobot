import { $$ } from './dom';

export function initYear(): void {
  const y = String(new Date().getFullYear());
  $$('[data-year]').forEach((el) => { el.textContent = y; });
}
