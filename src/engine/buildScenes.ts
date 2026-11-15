import { prepareQrArt } from '../services/qr';
import type { CardConfig } from '../schema';
import { contrastRatio, readableOn } from './color';
import { getDimensions, type Dimensions } from './geometry';
import { layoutBack } from './layout/back';
import type { SideColors } from './layout/common';
import { layoutFront } from './layout/front';
import { patternItems, textureItems } from './patterns';
import type { QrArt } from './qrDraw';
import type { Prim, Scene } from './scene';

export interface BuiltScenes {
  dims: Dimensions;
  front: Scene;
  back: Scene;
}

function sideColors(config: CardConfig, side: 'front' | 'back'): SideColors {
  const t = config.theme;
  if (side === 'back' && config.back.layout === 'bold-brand') {
    const fg = contrastRatio(t.textColor, t.accentColor) >= 4.5 ? t.textColor : readableOn(t.accentColor);
    return { bg: t.accentColor, fg, accent: fg };
  }
  return { bg: t.bgColor, fg: t.textColor, accent: t.accentColor };
}

function buildSide(
  config: CardConfig,
  side: 'front' | 'back',
  dims: Dimensions,
  qr: QrArt | null,
  texture: boolean
): Scene {
  const t = config.theme;
  const colors = sideColors(config, side);
  const seed = side === 'front' ? 1337 : 7331;
  const items: Prim[] = [];

  // 1. Pattern: always full-bleed
  items.push(...patternItems(t.pattern, dims, colors, seed));

  // 2. Border: stroked entirely INSIDE the safe zone
  if (t.borderWidth > 0) {
    const inset = dims.bleed + dims.safe + t.borderWidth / 2;
    items.push({
      t: 'rect',
      x: inset,
      y: inset,
      w: dims.trimW - 2 * dims.safe - t.borderWidth,
      h: dims.trimH - 2 * dims.safe - t.borderWidth,
      stroke: colors.accent,
      strokeWidth: t.borderWidth,
      radius: t.borderRadius,
    });
  }

  // 3. Content (always inside the safe zone)
  items.push(...(side === 'front' ? layoutFront(config, dims, colors) : layoutBack({ config, dims, colors, qr })));

  // 4. Paper texture - PNG preview only, never the PDF
  if (texture) items.push(...textureItems(t.paperTexture, dims, seed + 1));

  return { width: dims.pageW, height: dims.pageH, background: colors.bg, items };
}

export function buildScenes(config: CardConfig, opts: { texture: boolean }): BuiltScenes {
  const dims = getDimensions(config.standard, config.orientation);
  const qr = config.back.showQrCode ? prepareQrArt(config) : null; // may throw ApiError(422)
  return {
    dims,
    front: buildSide(config, 'front', dims, null, opts.texture),
    back: buildSide(config, 'back', dims, qr, opts.texture),
  };
}
