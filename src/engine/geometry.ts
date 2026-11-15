import type { CardConfig } from '../schema';

export const PT_PER_IN = 72;
export const PT_PER_MM = 72 / 25.4;
/** 0.125in = 3.175mm = exactly 9pt */
export const BLEED_PT = 0.125 * PT_PER_IN;
export const SAFE_PT = 0.125 * PT_PER_IN;
export const PNG_DPI = 300;

export interface Dimensions {
  trimW: number; // pt
  trimH: number;
  pageW: number; // pt, trim + bleed on all sides
  pageH: number;
  bleed: number;
  safe: number; // inset from trim edge inside which text/QR must stay
  pxW: number; // 300 DPI raster size including bleed
  pxH: number;
}

export function getDimensions(
  standard: CardConfig['standard'],
  orientation: CardConfig['orientation']
): Dimensions {
  const base =
    standard === 'US'
      ? { w: 3.5 * PT_PER_IN, h: 2 * PT_PER_IN } // 3.5" x 2.0"
      : { w: 85 * PT_PER_MM, h: 55 * PT_PER_MM }; // 85mm x 55mm
  const horizontal = orientation === 'horizontal';
  const trimW = horizontal ? base.w : base.h;
  const trimH = horizontal ? base.h : base.w;
  const pageW = trimW + 2 * BLEED_PT;
  const pageH = trimH + 2 * BLEED_PT;
  return {
    trimW,
    trimH,
    pageW,
    pageH,
    bleed: BLEED_PT,
    safe: SAFE_PT,
    // US: 1125 x 675. EU: 1079 x 725 (91.35mm x 61.35mm @ 300 DPI, rounded)
    pxW: Math.round((pageW / PT_PER_IN) * PNG_DPI),
    pxH: Math.round((pageH / PT_PER_IN) * PNG_DPI),
  };
}

/** Compact number formatting for SVG / PDF path strings. */
export const fmt = (v: number): string => String(Math.round(v * 1000) / 1000);

/** Rounded-rectangle path (cubic beziers, y-down coordinates). Space-separated for parser safety. */
export function roundRectPath(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const k = r * 0.5522847498;
  const p = (n: number) => fmt(n);
  return [
    `M ${p(x + r)} ${p(y)}`,
    `H ${p(x + w - r)}`,
    `C ${p(x + w - r + k)} ${p(y)} ${p(x + w)} ${p(y + r - k)} ${p(x + w)} ${p(y + r)}`,
    `V ${p(y + h - r)}`,
    `C ${p(x + w)} ${p(y + h - r + k)} ${p(x + w - r + k)} ${p(y + h)} ${p(x + w - r)} ${p(y + h)}`,
    `H ${p(x + r)}`,
    `C ${p(x + r - k)} ${p(y + h)} ${p(x)} ${p(y + h - r + k)} ${p(x)} ${p(y + h - r)}`,
    `V ${p(y + r)}`,
    `C ${p(x)} ${p(y + r - k)} ${p(x + r - k)} ${p(y)} ${p(x + r)} ${p(y)}`,
    'Z',
  ].join(' ');
}
