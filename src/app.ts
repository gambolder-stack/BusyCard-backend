import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { ApiError, errorHandler, notFoundHandler } from './errors';
import { apiLimiter } from './middleware/rateLimit';
import { exportRouter } from './routes/export';
import { qrRouter } from './routes/qr';
import { shareRouter } from './routes/share';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render terminates TLS behind exactly one proxy hop

  // CORP must be cross-origin or the Vercel frontend cannot read the binary responses.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(
    cors({
      origin: (origin, callback) => {
        // No Origin header = curl / server-to-server / same-origin: allow.
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new ApiError(403, 'CORS_ORIGIN_DENIED', `Origin ${origin} is not allowed.`));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['Content-Disposition', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
      maxAge: 86400,
    })
  );

  // Health check: cheap, no body parsing, no rate limit. Used by the frontend to wake Render.
  app.get('/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
  });

  app.use(express.json({ limit: '64kb' }));
  app.use('/api', apiLimiter);

  app.use('/api/export', exportRouter);
  app.use('/api/qr', qrRouter);
  app.use('/api/share', shareRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
