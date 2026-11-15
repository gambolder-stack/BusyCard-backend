import { createApp } from './app';
import { config } from './config';
import { assertFontsPresent } from './engine/fonts';

try {
  assertFontsPresent();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const app = createApp();
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[server] listening on :${config.port} (${config.isProd ? 'production' : 'development'})`);
  console.log(`[server] allowed origins: ${config.allowedOrigins.join(', ') || '(none)'}`);
  if (config.isProd && config.allowedOrigins.length === 0) {
    console.warn('[server] WARNING: FRONTEND_URL is not set - browsers will be rejected by CORS.');
  }
});

// Render's proxy keeps connections alive ~60s; stay above it to avoid sporadic 502s.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));
