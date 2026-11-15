import fs from 'node:fs';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { config } from '../config';
import { FONT_FAMILIES, type FontFamily } from '../schema';
import type { FontRef } from './scene';

export const FONT_FILES: Record<FontFamily, Record<400 | 700, string>> = {
  inter: { 400: 'Inter-Regular.ttf', 700: 'Inter-Bold.ttf' },
  playfair: { 400: 'PlayfairDisplay-Regular.ttf', 700: 'PlayfairDisplay-Bold.ttf' },
  'jetbrains-mono': { 400: 'JetBrainsMono-Regular.ttf', 700: 'JetBrainsMono-Bold.ttf' },
  'space-grotesk': { 400: 'SpaceGrotesk-Regular.ttf', 700: 'SpaceGrotesk-Bold.ttf' },
};

// Minimal structural typings for the parts of fontkit we use.
export interface FKGlyph {
  advanceWidth: number;
  path: { toSVG(): string };
}
export interface FKFont {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  layout(text: string): { glyphs: FKGlyph[] };
}

export const fontKey = (r: FontRef): string => `${r.family}:${r.weight}`;

const bytesCache = new Map<string, Buffer>();
const fontCache = new Map<string, FKFont>();

export function getFontBytes(ref: FontRef): Buffer {
  const key = fontKey(ref);
  let buf = bytesCache.get(key);
  if (!buf) {
    buf = fs.readFileSync(path.join(config.fontsDir, FONT_FILES[ref.family][ref.weight]));
    bytesCache.set(key, buf);
  }
  return buf;
}

/** Lazily parsed + cached, so cold starts stay fast and only used faces occupy RAM. */
export function getFont(ref: FontRef): FKFont {
  const key = fontKey(ref);
  let font = fontCache.get(key);
  if (!font) {
    font = (fontkit as unknown as { create(data: Uint8Array): FKFont }).create(getFontBytes(ref));
    fontCache.set(key, font);
  }
  return font;
}

/**
 * Width in points. Uses plain glyph advances (no kerning) - exactly what pdf-lib does when it
 * draws text - so layout measurements match the PDF and the glyph-path SVG pixel for pixel.
 */
export function measure(ref: FontRef, size: number, text: string): number {
  const font = getFont(ref);
  let w = 0;
  for (const g of font.layout(text).glyphs) w += g.advanceWidth;
  return (w * size) / font.unitsPerEm;
}

/** Ascent/descent as positive em fractions. */
export function fontMetrics(ref: FontRef): { ascent: number; descent: number } {
  const f = getFont(ref);
  return { ascent: f.ascent / f.unitsPerEm, descent: Math.abs(f.descent) / f.unitsPerEm };
}

export function assertFontsPresent(): void {
  const missing: string[] = [];
  for (const family of FONT_FAMILIES) {
    for (const weight of [400, 700] as const) {
      const file = path.join(config.fontsDir, FONT_FILES[family][weight]);
      if (!fs.existsSync(file)) missing.push(file);
    }
  }
  if (missing.length) {
    throw new Error(
      `Missing font files:\n  ${missing.join('\n  ')}\nRun "npm run fonts" (needs devDependencies) or see assets/fonts/README.md.`
    );
  }
}
