import type { CardConfig } from '../../schema';
import type { Dimensions } from '../geometry';
import type { FontRef, Prim } from '../scene';
import { wrapText } from '../text';
import { baselineIn, contentBox, LINE_HEIGHT, textAt, type SideColors } from './common';

interface Block {
  text: string;
  font: FontRef;
  size: number;
  color: string;
  gapAfter: number;
}
interface Line {
  text: string;
  font: FontRef;
  size: number;
  color: string;
  lineH: number;
  gapAfter: number;
}

function toLines(blocks: Block[], maxW: number, scale: number): Line[] {
  const out: Line[] = [];
  for (const b of blocks) {
    const size = b.size * scale;
    const wrapped = wrapText(b.text, b.font, size, maxW);
    wrapped.forEach((text, i) =>
      out.push({
        text,
        font: b.font,
        size,
        color: b.color,
        lineH: size * LINE_HEIGHT,
        gapAfter: i === wrapped.length - 1 ? b.gapAfter * scale : 0,
      })
    );
  }
  return out;
}

const heightOf = (lines: Line[]): number =>
  lines.reduce((sum, l, i) => sum + l.lineH + (i < lines.length - 1 ? l.gapAfter : 0), 0);

const RULE_W = 24;
const RULE_H = 1.5;
const RULE_GAP = 8;
const MIN_GAP = 6;

/**
 * Front layout (both orientations): identity block pinned to the top, accent rule, contact block
 * pinned to the bottom. If the content does not fit it shrinks uniformly (down to 50%), then drops
 * trailing contact lines - it never leaves the safe zone.
 */
export function layoutFront(config: CardConfig, dims: Dimensions, colors: SideColors): Prim[] {
  const { front, theme } = config;
  const box = contentBox(dims, theme);
  const R: FontRef = { family: theme.fontFamily, weight: 400 };
  const B: FontRef = { family: theme.fontFamily, weight: 700 };

  const top: Block[] = [];
  const bottom: Block[] = [];
  const add = (list: Block[], text: string, font: FontRef, size: number, color: string, gapAfter: number) => {
    if (text) list.push({ text, font, size, color, gapAfter });
  };
  add(top, front.fullName, B, 15, colors.fg, 3);
  add(top, front.title, R, 8.5, colors.fg, 1.5);
  add(top, front.company, B, 8.5, colors.accent, 0);
  add(bottom, front.customTagline, R, 7, colors.accent, 6);
  add(bottom, front.email, R, 7, colors.fg, 2.5);
  add(bottom, front.phone, R, 7, colors.fg, 2.5);
  add(bottom, front.website, R, 7, colors.fg, 2.5);
  add(bottom, front.address, R, 7, colors.fg, 2.5);

  let fit = 1;
  let topLines: Line[] = [];
  let bottomLines: Line[] = [];
  const compute = () => {
    const scale = theme.fontScale * fit;
    topLines = toLines(top, box.w, scale);
    bottomLines = toLines(bottom, box.w, scale);
  };
  const total = () =>
    heightOf(topLines) +
    (topLines.length ? (RULE_GAP + RULE_H) * fit : 0) +
    (topLines.length && bottomLines.length ? MIN_GAP * fit : 0) +
    heightOf(bottomLines);

  compute();
  while (total() > box.h && fit > 0.5) {
    fit = Math.max(0.5, fit * 0.94);
    compute();
  }
  while (total() > box.h && bottomLines.length > 0) bottomLines.pop();

  const items: Prim[] = [];
  let y = box.y;
  for (const l of topLines) {
    items.push(textAt(box.x, baselineIn(y, l.lineH, l.font, l.size), l.text, l.font, l.size, l.color));
    y += l.lineH + l.gapAfter;
  }
  if (topLines.length) {
    items.push({ t: 'rect', x: box.x, y: box.y + heightOf(topLines) + RULE_GAP * fit, w: RULE_W, h: RULE_H, fill: colors.accent });
  }
  let by = box.y + box.h - heightOf(bottomLines);
  for (const l of bottomLines) {
    items.push(textAt(box.x, baselineIn(by, l.lineH, l.font, l.size), l.text, l.font, l.size, l.color));
    by += l.lineH + l.gapAfter;
  }
  return items;
}
