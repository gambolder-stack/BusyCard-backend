import type { FontFamily } from '../schema';

export interface FontRef {
  family: FontFamily;
  weight: 400 | 700;
}

/**
 * Renderer-agnostic drawing primitives. Units are PDF points, origin top-left, y grows downward,
 * coordinates include the bleed. One Scene feeds BOTH the vector PDF renderer and the SVG->PNG
 * renderer, so the two outputs can never drift apart.
 */
export type Prim =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; strokeWidth?: number; radius?: number; opacity?: number }
  | { t: 'circle'; cx: number; cy: number; r: number; fill: string; opacity?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number; opacity?: number }
  | { t: 'path'; d: string; fill: string }
  /** x = left edge, y = baseline. Alignment is resolved by the layout code. */
  | { t: 'text'; x: number; y: number; text: string; size: number; font: FontRef; fill: string };

export interface Scene {
  width: number;
  height: number;
  background: string;
  items: Prim[];
}
