import { getFont } from './fonts';
import { fmt } from './geometry';
import type { Prim, Scene } from './scene';

const n = (v: number): string => String(Math.round(v * 100000) / 100000);

/** Glyph outlines instead of <text>: no font lookup inside resvg, identical shapes to the PDF. */
function textToSvg(p: Extract<Prim, { t: 'text' }>): string {
  const font = getFont(p.font);
  const s = p.size / font.unitsPerEm;
  let x = p.x;
  const parts: string[] = [];
  for (const glyph of font.layout(p.text).glyphs) {
    const d = glyph.path.toSVG();
    if (d) parts.push(`<path transform="matrix(${n(s)} 0 0 ${n(-s)} ${n(x)} ${n(p.y)})" d="${d}"/>`);
    x += glyph.advanceWidth * s;
  }
  return `<g fill="${p.fill}">${parts.join('')}</g>`;
}

export function sceneToSvg(scene: Scene, pxW: number, pxH: number): string {
  const W = fmt(scene.width);
  const H = fmt(scene.height);
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`,
    `<rect x="0" y="0" width="${W}" height="${H}" fill="${scene.background}"/>`,
  ];
  for (const p of scene.items) {
    switch (p.t) {
      case 'rect': {
        const attrs = [`x="${fmt(p.x)}" y="${fmt(p.y)}" width="${fmt(p.w)}" height="${fmt(p.h)}"`];
        if (p.radius) attrs.push(`rx="${fmt(p.radius)}"`);
        attrs.push(`fill="${p.fill ?? 'none'}"`);
        if (p.stroke && p.strokeWidth) attrs.push(`stroke="${p.stroke}" stroke-width="${fmt(p.strokeWidth)}"`);
        if (p.opacity !== undefined) attrs.push(`opacity="${n(p.opacity)}"`);
        out.push(`<rect ${attrs.join(' ')}/>`);
        break;
      }
      case 'circle':
        out.push(
          `<circle cx="${n(p.cx)}" cy="${n(p.cy)}" r="${n(p.r)}" fill="${p.fill}"${p.opacity !== undefined ? ` opacity="${n(p.opacity)}"` : ''}/>`
        );
        break;
      case 'line':
        out.push(
          `<line x1="${n(p.x1)}" y1="${n(p.y1)}" x2="${n(p.x2)}" y2="${n(p.y2)}" stroke="${p.stroke}" stroke-width="${n(p.width)}"${p.opacity !== undefined ? ` opacity="${n(p.opacity)}"` : ''}/>`
        );
        break;
      case 'path':
        out.push(`<path d="${p.d}" fill="${p.fill}"/>`);
        break;
      case 'text':
        out.push(textToSvg(p));
        break;
    }
  }
  out.push('</svg>');
  return out.join('');
}
