import { fmt } from './geometry';
import { measure } from './fonts';
import type { FontRef, Prim } from './scene';

export interface QrMatrix {
  size: number;
  /** row-major, 1 = dark module */
  data: ArrayLike<number>;
}

export interface QrArt {
  matrix: QrMatrix;
  dark: string;
  light: string;
  caption: string;
}

const QUIET_MODULES = 3;

/**
 * Draws a QR code as ONE vector path on a rounded "plate" (the quiet zone).
 * (x, y) = plate top-left, `plate` = plate side in pt. Optional center badge (ECC H tolerates ~30%
 * damage; the badge covers < 5% of the area).
 */
export function drawQr(o: {
  matrix: QrMatrix;
  x: number;
  y: number;
  plate: number;
  dark: string;
  light: string;
  logoText?: string;
  logoFont?: FontRef;
}): Prim[] {
  const n = o.matrix.size;
  const m = o.plate / (n + QUIET_MODULES * 2);
  const ox = o.x + QUIET_MODULES * m;
  const oy = o.y + QUIET_MODULES * m;

  const items: Prim[] = [
    { t: 'rect', x: o.x, y: o.y, w: o.plate, h: o.plate, fill: o.light, radius: Math.min(3, o.plate * 0.04) },
  ];

  let d = '';
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!o.matrix.data[r * n + c]) {
        c++;
        continue;
      }
      const start = c;
      while (c < n && o.matrix.data[r * n + c]) c++;
      const len = c - start;
      d += `M ${fmt(ox + start * m)} ${fmt(oy + r * m)} h ${fmt(len * m)} v ${fmt(m)} h ${fmt(-len * m)} Z `;
    }
  }
  items.push({ t: 'path', d: d.trim(), fill: o.dark });

  if (o.logoText && o.logoFont) {
    const side = n * m * 0.22;
    const cx = o.x + o.plate / 2;
    const cy = o.y + o.plate / 2;
    items.push({ t: 'rect', x: cx - side / 2, y: cy - side / 2, w: side, h: side, fill: o.light, radius: 2 });
    let size = side * 0.55;
    const w = measure(o.logoFont, size, o.logoText);
    if (w > side * 0.8) size *= (side * 0.8) / w;
    const tw = measure(o.logoFont, size, o.logoText);
    items.push({ t: 'text', x: cx - tw / 2, y: cy + size * 0.35, text: o.logoText, size, font: o.logoFont, fill: o.dark });
  }
  return items;
}
