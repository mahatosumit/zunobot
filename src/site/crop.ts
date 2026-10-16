import { html, type Safe } from './html';

export type PlateName = 'front' | 'rear' | 'side';

export interface CropSpec {
  plate: PlateName;
  /** Magnification of the 1024px plate inside a square-ish frame. */
  zoom: number;
  /** Point of interest as a fraction (0 to 1) of the plate. */
  x: number;
  y: number;
}

/**
 * Renders a decorative crop of one of the supplied renders as a CSS background.
 * `ar` is the frame's width/height. The maths centres (x, y) in the frame.
 */
export function crop(spec: CropSpec, ar = 1, extraClass = ''): Safe {
  const { zoom: z, x, y } = spec;
  const posX = z === 1 ? 50 : ((0.5 - x * z) / (1 - z)) * 100;
  const posY = z === 1 ? 50 : ((0.5 / ar - y * z) / (1 / ar - z)) * 100;
  const clamp = (v: number): number => Math.min(100, Math.max(0, v));
  const style = `--img:url(/images/${spec.plate}-plate-1024.webp);--zoom:${z * 100}%;--px:${clamp(posX).toFixed(2)}%;--py:${clamp(posY).toFixed(2)}%;aspect-ratio:${ar}`;
  return html`<div class="crop ${extraClass}" style="${style}" aria-hidden="true"></div>`;
}
