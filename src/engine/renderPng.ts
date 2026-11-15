import { Resvg } from '@resvg/resvg-js';
import type { Dimensions } from './geometry';
import type { Scene } from './scene';
import { sceneToSvg } from './svg';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Writes a pHYs chunk (11811 px/m = 300 DPI) so Photoshop/print shops see the real resolution. */
function embed300Dpi(png: Buffer): Buffer {
  if (png.indexOf('pHYs') !== -1) return png;
  const type = Buffer.from('pHYs');
  const data = Buffer.alloc(9);
  data.writeUInt32BE(11811, 0);
  data.writeUInt32BE(11811, 4);
  data[8] = 1; // unit = metre
  const length = Buffer.alloc(4);
  length.writeUInt32BE(9, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])), 0);
  const IHDR_END = 8 + 25; // PNG signature + IHDR chunk
  return Buffer.concat([png.subarray(0, IHDR_END), length, type, data, crc, png.subarray(IHDR_END)]);
}

/** Rasterizes one scene (bleed included) to a 300 DPI PNG. ~3 MB RAM per render. */
export function renderPng(scene: Scene, dims: Dimensions): Buffer {
  const svg = sceneToSvg(scene, dims.pxW, dims.pxH);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: dims.pxW },
    font: { loadSystemFonts: false },
  });
  return embed300Dpi(Buffer.from(resvg.render().asPng()));
}
