import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type Color, type PDFFont, type PDFPage } from 'pdf-lib';
import type { CardConfig } from '../schema';
import { buildScenes } from './buildScenes';
import { hexToRgb, readableOn } from './color';
import { fontKey, getFontBytes } from './fonts';
import { roundRectPath, type Dimensions } from './geometry';
import type { Prim, Scene } from './scene';

const rgbOf = (hex: string): Color => {
  const { r, g, b } = hexToRgb(hex);
  return rgb(r / 255, g / 255, b / 255);
};

function drawPrim(page: PDFPage, H: number, p: Prim, fonts: Map<string, PDFFont>): void {
  switch (p.t) {
    case 'rect': {
      const hasStroke = p.stroke !== undefined && (p.strokeWidth ?? 0) > 0;
      const opts: { color?: Color; borderColor?: Color; borderWidth?: number; opacity?: number; borderOpacity?: number } = {};
      if (p.fill) opts.color = rgbOf(p.fill);
      if (hasStroke) {
        opts.borderColor = rgbOf(p.stroke as string);
        opts.borderWidth = p.strokeWidth;
      }
      if (p.opacity !== undefined) opts.opacity = p.opacity;
      if ((p.radius ?? 0) > 0) {
        page.drawSvgPath(roundRectPath(p.x, p.y, p.w, p.h, p.radius as number), { x: 0, y: H, ...opts });
      } else {
        page.drawRectangle({ x: p.x, y: H - p.y - p.h, width: p.w, height: p.h, ...opts });
      }
      break;
    }
    case 'circle':
      page.drawCircle({ x: p.cx, y: H - p.cy, size: p.r, color: rgbOf(p.fill), ...(p.opacity !== undefined ? { opacity: p.opacity } : {}) });
      break;
    case 'line':
      page.drawLine({
        start: { x: p.x1, y: H - p.y1 },
        end: { x: p.x2, y: H - p.y2 },
        thickness: p.width,
        color: rgbOf(p.stroke),
        ...(p.opacity !== undefined ? { opacity: p.opacity } : {}),
      });
      break;
    case 'path':
      // Scene paths are absolute, y-down. drawSvgPath flips y around the given origin.
      page.drawSvgPath(p.d, { x: 0, y: H, color: rgbOf(p.fill) });
      break;
    case 'text': {
      const font = fonts.get(fontKey(p.font));
      if (!font) throw new Error(`Font ${fontKey(p.font)} was not embedded`);
      page.drawText(p.text, { x: p.x, y: H - p.y, size: p.size, font, color: rgbOf(p.fill) });
      break;
    }
  }
}

/** Hairline ticks inside the bleed strip, aligned with the trim lines, never touching the trim area. */
function drawCropMarks(page: PDFPage, dims: Dimensions, bg: string): void {
  const { pageW: W, pageH: H, bleed: B } = dims;
  const color = rgbOf(readableOn(bg, '#ffffff', '#000000'));
  const corners: Array<[number, number]> = [
    [B, B],
    [W - B, B],
    [B, H - B],
    [W - B, H - B],
  ];
  for (const [cx, cy] of corners) {
    const dx = cx < W / 2 ? -1 : 1;
    const dy = cy < H / 2 ? -1 : 1;
    page.drawLine({
      start: { x: cx + dx * 1.5, y: H - cy },
      end: { x: cx + dx * (B - 0.75), y: H - cy },
      thickness: 0.25,
      color,
    });
    page.drawLine({
      start: { x: cx, y: H - (cy + dy * 1.5) },
      end: { x: cx, y: H - (cy + dy * (B - 0.75)) },
      thickness: 0.25,
      color,
    });
  }
}

function drawScene(page: PDFPage, scene: Scene, dims: Dimensions, fonts: Map<string, PDFFont>, cropMarks: boolean): void {
  const H = scene.height;
  page.setBleedBox(0, 0, dims.pageW, dims.pageH);
  page.setTrimBox(dims.bleed, dims.bleed, dims.trimW, dims.trimH);
  page.drawRectangle({ x: 0, y: 0, width: scene.width, height: scene.height, color: rgbOf(scene.background), borderWidth: 0 });
  for (const p of scene.items) drawPrim(page, H, p, fonts);
  if (cropMarks) drawCropMarks(page, dims, scene.background);
}

/**
 * 2-page vector PDF (front, back) at bleed size: 3.75"x2.25" (US) / 91.35x61.35mm (EU).
 * Ink layers only: paperTexture is deliberately not rendered. RGB colour space.
 */
export async function renderPdf(config: CardConfig, opts: { cropMarks: boolean }): Promise<Uint8Array> {
  const { dims, front, back } = buildScenes(config, { texture: false });

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle('Business Card - print ready');
  pdf.setProducer('Business Card Generator');
  pdf.setCreator('Business Card Generator');
  pdf.setCreationDate(new Date());

  const fonts = new Map<string, PDFFont>();
  for (const scene of [front, back]) {
    for (const p of scene.items) {
      if (p.t !== 'text') continue;
      const key = fontKey(p.font);
      if (!fonts.has(key)) fonts.set(key, await pdf.embedFont(getFontBytes(p.font), { subset: true }));
    }
  }

  for (const scene of [front, back]) {
    const page = pdf.addPage([dims.pageW, dims.pageH]);
    drawScene(page, scene, dims, fonts, opts.cropMarks);
  }
  return pdf.save({ useObjectStreams: false });
}
