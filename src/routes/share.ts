import { Router } from 'express';
import { asyncHandler } from '../errors';
import { CardConfigSchema } from '../schema';
import { decodeConfig, encodeConfig } from '../services/share';

export const shareRouter = Router();

// POST /api/share  (body = CardConfig)  ->  { token }
shareRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const config = CardConfigSchema.parse(req.body);
    res.status(201).json({ token: encodeConfig(config) });
  })
);

// GET /api/share/:token  ->  { config }
shareRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const config = decodeConfig(req.params.token);
    res.set('Cache-Control', 'public, max-age=3600');
    res.status(200).json({ config });
  })
);
