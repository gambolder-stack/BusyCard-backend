import path from 'node:path';

const isProd = process.env.NODE_ENV === 'production';
const stripTrailingSlash = (s: string): string => s.trim().replace(/\/+$/, '');

const intFrom = (v: string | undefined, fallback: number): number => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const frontendOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map(stripTrailingSlash)
  .filter(Boolean);

// localhost:5173 (Vite) is only allowed outside production.
const devOrigins = isProd ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'];

export const config = {
  isProd,
  port: intFrom(process.env.PORT, 3000),
  allowedOrigins: Array.from(new Set([...frontendOrigins, ...devOrigins])),
  // dist/config.js and src/config.ts both resolve to <project>/assets/fonts
  fontsDir: process.env.FONTS_DIR
    ? path.resolve(process.env.FONTS_DIR)
    : path.resolve(__dirname, '..', 'assets', 'fonts'),
  rateLimit: {
    exportWindowMs: intFrom(process.env.EXPORT_RATE_WINDOW_MS, 10 * 60 * 1000),
    exportMax: intFrom(process.env.EXPORT_RATE_MAX, 20),
    apiWindowMs: 15 * 60 * 1000,
    apiMax: intFrom(process.env.API_RATE_MAX, 300),
  },
};
