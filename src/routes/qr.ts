import { Router } from 'express';
import { asyncHandler } from '../errors';
import { CardConfigSchema } from '../schema';
import { generateQrForApi } from '../services/qr';

export const qrRouter = Router();

// POST /api/qr  (body = CardConfig)  ->  { svg, dataUrl }
qrRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const config = CardConfigSchema.parse(req.body);
    res.status(200).json(await generateQrForApi(config));
  })
);
