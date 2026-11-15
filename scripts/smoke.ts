// Offline smoke test: renders the example card with every layout/orientation/standard into ./out
// and prints RSS so you can confirm the memory budget.  Run: npm run smoke
import fs from 'node:fs';
import path from 'node:path';
import { buildScenes } from '../src/engine/buildScenes';
import { assertFontsPresent } from '../src/engine/fonts';
import { renderPdf } from '../src/engine/renderPdf';
import { renderPng } from '../src/engine/renderPng';
import { CardConfigSchema } from '../src/schema';
import { generateQrForApi } from '../src/services/qr';
import { decodeConfig, encodeConfig } from '../src/services/share';

async function main(): Promise<void> {
  assertFontsPresent();
  const base = CardConfigSchema.parse(JSON.parse(fs.readFileSync('examples/card-config.example.json', 'utf8')));
  const out = path.resolve('out');
  fs.mkdirSync(out, { recursive: true });

  for (const standard of ['US', 'EU'] as const) {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      for (const layout of ['minimal', 'bold-brand', 'qr-focus'] as const) {
        const cfg = CardConfigSchema.parse({
          ...base,
          standard,
          orientation,
          back: { ...base.back, layout },
          theme: { ...base.theme, borderWidth: 1, borderRadius: 8 },
        });
        const name = `${standard}-${orientation}-${layout}`;
        const pdf = await renderPdf(cfg, { cropMarks: true });
        fs.writeFileSync(path.join(out, `${name}.pdf`), pdf);
        const { dims, front, back } = buildScenes(cfg, { texture: true });
        fs.writeFileSync(path.join(out, `${name}-front.png`), renderPng(front, dims));
        fs.writeFileSync(path.join(out, `${name}-back.png`), renderPng(back, dims));
        console.log(`${name}: pdf ${pdf.length}B, png ${dims.pxW}x${dims.pxH}, rss ${(process.memoryUsage().rss / 1048576).toFixed(0)}MB`);
      }
    }
  }

  const qr = await generateQrForApi(base);
  console.log('qr svg chars:', qr.svg.length, 'dataUrl prefix:', qr.dataUrl.slice(0, 22));
  const token = encodeConfig(base);
  console.log('share token length:', token.length, 'roundtrip ok:', JSON.stringify(decodeConfig(token)) === JSON.stringify(base));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
