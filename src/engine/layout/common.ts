import type { CardConfig } from '../../schema';
import { fontMetrics, measure } from '../fonts';
import type { Dimensions } from '../geometry';
import type { FontRef, Prim } from '../scene';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SideColors {
  bg: string;
  fg: string;
  accent: string;
}

export const LINE_HEIGHT = 1.3;

/**
 * Content box = trim edge + 0.125" safe zone + border + padding. Because the inset always includes
 * the safe zone, no text/QR can ever cross it, whatever the theme sliders are set to.
 * `padding` defaults to 6pt * paddingScale.
 */
export function contentBox(dims: Dimensions, theme: CardConfig['theme'], padding?: number): Box {
  const border = theme.borderWidth > 0 ? theme.borderWidth : 0;
  const pad = padding ?? 6 * theme.paddingScale;
  const inset = dims.bleed + dims.safe + border + pad;
  return { x: inset, y: inset, w: Math.max(20, dims.pageW - 2 * inset), h: Math.max(20, dims.pageH - 2 * inset) };
}

/** Baseline y for a line box [top, top+lineH] so the text sits vertically centered in it. */
export function baselineIn(top: number, lineH: number, font: FontRef, size: number): number {
  const m = fontMetrics(font);
  const asc = m.ascent * size;
  const desc = m.descent * size;
  return top + (lineH - (asc + desc)) / 2 + asc;
}

export function textAt(x: number, baseline: number, text: string, font: FontRef, size: number, fill: string): Prim {
  return { t: 'text', x, y: baseline, text, size, font, fill };
}

export function centeredText(cx: number, baseline: number, text: string, font: FontRef, size: number, fill: string): Prim {
  return textAt(cx - measure(font, size, text) / 2, baseline, text, font, size, fill);
}
