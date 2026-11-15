import type { CardConfig } from '../../schema';
import type { Dimensions } from '../geometry';
import { drawQr, type QrArt } from '../qrDraw';
import type { FontRef, Prim } from '../scene';
import { fitSize } from '../text';
import { baselineIn, centeredText, contentBox, LINE_HEIGHT, textAt, type SideColors } from './common';

export interface BackInput {
  config: CardConfig;
  dims: Dimensions;
  colors: SideColors;
  /** null when showQrCode is false */
  qr: QrArt | null;
}

export function layoutBack(input: BackInput): Prim[] {
  switch (input.config.back.layout) {
    case 'bold-brand':
      return boldBrand(input);
    case 'qr-focus':
      return input.qr ? qrFocus(input) : minimal(input);
    default:
      return minimal(input);
  }
}

const fonts = (family: CardConfig['theme']['fontFamily']): { R: FontRef; B: FontRef } => ({
  R: { family, weight: 400 },
  B: { family, weight: 700 },
});

/** minimal: centered QR + caption (or a centered wordmark when there is no QR). */
function minimal({ config, dims, colors, qr }: BackInput): Prim[] {
  const { theme, back } = config;
  const { B } = fonts(theme.fontFamily);
  const box = contentBox(dims, theme);
  const cx = box.x + box.w / 2;

  if (qr) {
    const capSize = fitSize(qr.caption, B, 5.5 * theme.fontScale, box.w);
    const capH = capSize * LINE_HEIGHT;
    const gap = 3;
    const plate = Math.max(20, Math.min(box.w, box.h - capH - gap));
    const top = box.y + (box.h - (plate + gap + capH)) / 2;
    return [
      ...drawQr({ matrix: qr.matrix, x: cx - plate / 2, y: top, plate, dark: qr.dark, light: qr.light, logoText: back.centerLogoText || undefined, logoFont: B }),
      centeredText(cx, baselineIn(top + plate + gap, capH, B, capSize), qr.caption, B, capSize, colors.fg),
    ];
  }
  return brandCenter({ config, dims, colors, qr });
}

function brandCenter({ config, dims, colors }: BackInput): Prim[] {
  const { theme, front, back } = config;
  const { R, B } = fonts(theme.fontFamily);
  const box = contentBox(dims, theme);
  const cx = box.x + box.w / 2;
  const primary = back.centerLogoText || front.company || front.fullName;
  const secondary = front.website || front.customTagline;
  if (!primary && !secondary) return [];

  const pSize = primary ? fitSize(primary, B, 18 * theme.fontScale, box.w) : 0;
  const sSize = secondary ? fitSize(secondary, R, 7.5 * theme.fontScale, box.w) : 0;
  const pH = pSize * LINE_HEIGHT;
  const sH = sSize * LINE_HEIGHT;
  const gap = primary && secondary ? 4 : 0;
  let y = box.y + (box.h - (pH + gap + sH)) / 2;
  const items: Prim[] = [];
  if (primary) {
    items.push(centeredText(cx, baselineIn(y, pH, B, pSize), primary, B, pSize, colors.fg));
    y += pH + gap;
  }
  if (secondary) items.push(centeredText(cx, baselineIn(y, sH, R, sSize), secondary, R, sSize, colors.accent));
  return items;
}

/** qr-focus: the largest possible QR, centered, using the whole safe area. */
function qrFocus({ config, dims, qr }: BackInput): Prim[] {
  if (!qr) return [];
  const { theme, back } = config;
  const { B } = fonts(theme.fontFamily);
  const inset = dims.bleed + dims.safe + (theme.borderWidth > 0 ? theme.borderWidth : 0) + 3;
  const w = dims.pageW - 2 * inset;
  const h = dims.pageH - 2 * inset;
  const plate = Math.min(w, h);
  return drawQr({
    matrix: qr.matrix,
    x: (dims.pageW - plate) / 2,
    y: (dims.pageH - plate) / 2,
    plate,
    dark: qr.dark,
    light: qr.light,
    logoText: back.centerLogoText || undefined,
    logoFont: B,
  });
}

interface StackLine {
  text: string;
  font: FontRef;
  size: number;
  color: string;
  lineH: number;
  gapAfter: number;
}

function stackHeight(lines: StackLine[]): number {
  return lines.reduce((s, l, i) => s + l.lineH + (i < lines.length - 1 ? l.gapAfter : 0), 0);
}

function emitStack(lines: StackLine[], x: number, top: number): Prim[] {
  const items: Prim[] = [];
  let y = top;
  for (const l of lines) {
    items.push(textAt(x, baselineIn(y, l.lineH, l.font, l.size), l.text, l.font, l.size, l.color));
    y += l.lineH + l.gapAfter;
  }
  return items;
}

function initials(s: string): string {
  const words = s.split(' ').filter(Boolean);
  if (!words.length) return '';
  const letters = words.length === 1 ? Array.from(words[0]).slice(0, 2) : [Array.from(words[0])[0], Array.from(words[1])[0]];
  return letters.join('').toLocaleUpperCase();
}

/** bold-brand: full-bleed accent background, big monogram, small QR plate. */
function boldBrand({ config, dims, colors, qr }: BackInput): Prim[] {
  const { theme, front, back } = config;
  const { R, B } = fonts(theme.fontFamily);
  const box = contentBox(dims, theme);
  const fs = theme.fontScale;
  const horizontal = dims.pageW >= dims.pageH;
  const gap = 8;

  const mono = back.centerLogoText || initials(front.company || front.fullName);
  const label = front.company || front.fullName;
  const sub = front.customTagline || front.website;

  const build = (maxW: number, monoBase: number): StackLine[] => {
    const lines: StackLine[] = [];
    if (mono) {
      const size = fitSize(mono, B, monoBase, maxW);
      lines.push({ text: mono, font: B, size, color: colors.fg, lineH: size * 1.1, gapAfter: 4 });
    }
    if (label) {
      const size = fitSize(label, B, 9 * fs, maxW);
      lines.push({ text: label, font: B, size, color: colors.fg, lineH: size * LINE_HEIGHT, gapAfter: 2 });
    }
    if (sub) {
      const size = fitSize(sub, R, 7 * fs, maxW);
      lines.push({ text: sub, font: R, size, color: colors.fg, lineH: size * LINE_HEIGHT, gapAfter: 0 });
    }
    return lines;
  };

  if (horizontal) {
    const plate = qr ? Math.min(box.h, box.w * 0.46) : 0;
    const leftW = qr ? box.w - plate - gap : box.w;
    const stack = build(leftW, Math.min(box.h * 0.45, 36 * fs));
    const items = emitStack(stack, box.x, box.y + (box.h - stackHeight(stack)) / 2);
    if (qr) {
      items.push(...drawQr({ matrix: qr.matrix, x: box.x + box.w - plate, y: box.y + (box.h - plate) / 2, plate, dark: qr.dark, light: qr.light }));
    }
    return items;
  }

  const stack = build(box.w, 30 * fs);
  const sh = stackHeight(stack);
  if (!qr) return emitStack(stack, box.x, box.y + (box.h - sh) / 2);
  const plate = Math.max(30, Math.min(box.w, box.h - sh - gap));
  return [
    ...emitStack(stack, box.x, box.y),
    ...drawQr({ matrix: qr.matrix, x: box.x + (box.w - plate) / 2, y: box.y + box.h - plate, plate, dark: qr.dark, light: qr.light }),
  ];
}
