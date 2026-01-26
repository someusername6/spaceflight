/**
 * Signaling server entry point.
 *
 * Run with: npm run dev
 */

import express from 'express';
import { getConfig } from './config.js';
import { logger } from './logger.js';
import { RateLimiter } from './rate-limiter.js';
import { configureRoutes } from './routes.js';
import { MemoryStorage } from './storage/memory-storage.js';

const config = getConfig();
const storage = new MemoryStorage(config);
const rateLimiter = new RateLimiter(config);

const app = express();

// Middleware
app.use(express.json({ limit: '100kb' }));

// CORS configuration
// In production, restrict to specific origins via CORS_ALLOWED_ORIGINS env var
// In development, allow all origins for convenience
const allowedOrigins = config.isProduction
  ? (process.env.CORS_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
  : null; // null means allow all

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins === null) {
    // Development: allow all origins
    res.header('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    // Production: only allow specified origins
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  // If origin not in allowed list, don't set CORS headers (browser will block)

  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Configure routes
const router = express.Router();
configureRoutes(router, storage, rateLimiter, config);
app.use(router);

// Debug endpoint to trigger cleanup (local dev only)
if (!config.isProduction) {
  app.post('/debug/cleanup', async (_req, res) => {
    const now = Date.now();
    await storage.cleanup(now);
    rateLimiter.cleanup();
    res.json({ success: true, timestamp: now });
  });
}

// Periodic cleanup (every minute)
setInterval(() => {
  const now = Date.now();
  storage.cleanup(now).catch((err) => {
    logger.error('Cleanup error', { error: String(err) });
  });
  rateLimiter.cleanup();
}, 60000);

// Start server
app.listen(config.port, () => {
  logger.info(`Signaling server running on http://localhost:${config.port}`);
  logger.info(`Health check: http://localhost:${config.port}/health`);
});
