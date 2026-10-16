import { raw, type Safe } from './html';

const svg = (inner: string, extra = ''): Safe =>
  raw(`<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra}>${inner}</svg>`);

export const icons = {
  arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  arrowDown: svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  menu: svg('<path d="M4 8h16M4 16h16"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  rotate: svg('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>'),
  pause: svg('<path d="M9 6v12M15 6v12"/>'),
  play: svg('<path d="M8 5.5v13l10-6.5z"/>'),
  cube: svg('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>'),
} as const;

/** The ZunoBot mark: a faceted display outline with the robot's cyan expression. */
export const logoMark = (size = 28): Safe =>
  raw(`<svg class="logo-mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false"><path d="M2.5 16 8.4 6.6h15.2L29.5 16l-5.9 9.4H8.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10.5 14.2c.9-1.3 2.3-1.3 3.2 0M18.3 14.2c.9-1.3 2.3-1.3 3.2 0" fill="none" stroke="var(--c-cyan)" stroke-width="1.7" stroke-linecap="round"/><path d="M11.2 18.6c2.8 2.3 7.8 2.3 9.6 0" fill="none" stroke="var(--c-cyan)" stroke-width="1.7" stroke-linecap="round"/></svg>`);
