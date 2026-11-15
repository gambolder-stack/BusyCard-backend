import rateLimit from 'express-rate-limit';
import { config } from '../config';

const limited = (message: string) => ({ error: { code: 'RATE_LIMITED', message } });

/** Strict limiter for the CPU-heavy export routes. */
export const exportLimiter = rateLimit({
  windowMs: config.rateLimit.exportWindowMs,
  limit: config.rateLimit.exportMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: limited('Too many export requests. Please wait a few minutes and try again.'),
});

/** Looser limiter for everything else under /api. */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.apiWindowMs,
  limit: config.rateLimit.apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: limited('Too many requests. Please slow down.'),
});
