import type { CardConfig } from '../schema';
import { mix } from './color';
import type { Dimensions } from './geometry';
import { mulberry32 } from './prng';
import type { Prim } from './scene';

interface PatternColors {
  bg: string;
  fg: string;
  accent: string;
}

/**
 * Vector patterns covering the FULL page (bleed included). Transparency is pre-mixed into flat
 * colors so the PDF contains no soft-masks / ExtGStates - safest for print RIPs.
 */
export function patternItems(
  kind: CardConfig['theme']['pattern'],
  dims: Dimensions,
  c: PatternColors,
  seed: number
): Prim[] {
  const W = dims.pageW;
  const H = dims.pageH;
  const items: Prim[] = [];
  const step = 12;

  if (kind === 'dots') {
    const fill = mix(c.bg, c.accent, 0.25);
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) items.push({ t: 'circle', cx: x, cy: y, r: 0.9, fill });
    }
  } else if (kind === 'grid') {
    const stroke = mix(c.bg, c.accent, 0.18);
    for (let x = 0; x <= W; x += step) items.push({ t: 'line', x1: x, y1: 0, x2: x, y2: H, stroke, width: 0.4 });
    for (let y = 0; y <= H; y += step) items.push({ t: 'line', x1: 0, y1: y, x2: W, y2: y, stroke, width: 0.4 });
  } else if (kind === 'noise') {
    const rnd = mulberry32(seed);
    const count = Math.round((W * H) / 70);
    for (let i = 0; i < count; i++) {
      items.push({
        t: 'circle',
        cx: rnd() * W,
        cy: rnd() * H,
        r: 0.25 + rnd() * 0.55,
        fill: mix(c.bg, c.fg, 0.08 + rnd() * 0.14),
      });
    }
  }
  return items;
}

/** Preview-style paper texture. PNG-only and opt-in (?includeTexture=true); NEVER used in the PDF. */
export function textureItems(kind: CardConfig['theme']['paperTexture'], dims: Dimensions, seed: number): Prim[] {
  const W = dims.pageW;
  const H = dims.pageH;
  const rnd = mulberry32(seed);
  const items: Prim[] = [];
  if (kind === 'matte') {
    items.push({ t: 'rect', x: 0, y: 0, w: W, h: H, fill: '#ffffff', opacity: 0.04 });
  } else if (kind === 'kraft') {
    items.push({ t: 'rect', x: 0, y: 0, w: W, h: H, fill: '#a67c52', opacity: 0.3 });
    const count = Math.round((W * H) / 40);
    for (let i = 0; i < count; i++) {
      items.push({ t: 'circle', cx: rnd() * W, cy: rnd() * H, r: 0.2 + rnd() * 0.5, fill: '#4a3320', opacity: 0.12 + rnd() * 0.18 });
    }
  } else if (kind === 'cotton') {
    items.push({ t: 'rect', x: 0, y: 0, w: W, h: H, fill: '#fffaf0', opacity: 0.06 });
    const count = Math.round((W * H) / 60);
    for (let i = 0; i < count; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const a = rnd() * Math.PI * 2;
      const len = 2 + rnd() * 5;
      items.push({ t: 'line', x1: x, y1: y, x2: x + Math.cos(a) * len, y2: y + Math.sin(a) * len, stroke: '#8c8c8c', width: 0.25, opacity: 0.1 });
    }
  }
  return items;
}
