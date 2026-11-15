import archiver from 'archiver';
import { Router } from 'express';
import { z } from 'zod';
import { buildScenes } from '../engine/buildScenes';
import { renderPdf } from '../engine/renderPdf';
import { renderPng } from '../engine/renderPng';
import { asyncHandler } from '../errors';
import { exportLimiter } from '../middleware/rateLimit';
import { CardConfigSchema } from '../schema';

const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');
const PdfQuery = z.object({ cropMarks: flag });
const PngQuery = z.object({ includeTexture: flag });

export const exportRouter = Router();
exportRouter.use(exportLimiter);

// POST /api/export/pdf?cropMarks=true|false
exportRouter.post(
  '/pdf',
  asyncHandler(async (req, res) => {
    const { cropMarks } = PdfQuery.parse(req.query);
    const config = CardConfigSchema.parse(req.body);
    const pdf = await renderPdf(config, { cropMarks });
    const body = Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength);
    res.status(200).set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="business-cards-print.pdf"',
      'Content-Length': String(body.length),
      'Cache-Control': 'no-store',
    });
    res.end(body);
  })
);

// POST /api/export/png[?includeTexture=true]
exportRouter.post(
  '/png',
  asyncHandler(async (req, res) => {
    const { includeTexture } = PngQuery.parse(req.query);
    const config = CardConfigSchema.parse(req.body);
    const { dims, front, back } = buildScenes(config, { texture: includeTexture });

    // Render sequentially BEFORE streaming so any failure still yields a clean JSON error.
    const frontPng = renderPng(front, dims);
    const backPng = renderPng(back, dims);

    res.status(200).set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="business-cards-300dpi.zip"',
      'Cache-Control': 'no-store',
    });
    const archive = archiver('zip', { store: true }); // PNGs are already compressed
    archive.on('error', (err) => {
      console.error('[zip]', err);
      res.destroy(err);
    });
    archive.pipe(res);
    archive.append(frontPng, { name: 'card-front-300dpi.png' });
    archive.append(backPng, { name: 'card-back-300dpi.png' });
    await archive.finalize();
  })
);
