/**
 * Express route definitions.
 */

import type { Request, Response, Router } from 'express';
import type { Config } from './config.js';
import {
  createRoom,
  deleteRoom,
  getEvents,
  getSignals,
  joinRoom,
  kick,
  leaveRoom,
  postSignal,
  setState,
} from './handlers/index.js';
import { logger } from './logger.js';
import type { RateLimiter } from './rate-limiter.js';
import { isValidRoomCode } from './room-code.js';
import type { SignalingStorage } from './storage/types.js';
import type { ErrorResponse } from './types.js';

/**
 * Get client IP from request, handling proxies.
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
  }
  return req.ip ?? 'unknown';
}

/**
 * Extract and validate a room code from route params.
 * Returns null if invalid.
 */
function getRoomCode(req: Request): string | null {
  const value = req.params.code;
  if (typeof value !== 'string') {
    return null;
  }
  const code = value.toUpperCase();
  if (!isValidRoomCode(code)) {
    return null;
  }
  return code;
}

/** Invalid room code response */
const INVALID_CODE_RESPONSE = {
  status: 400,
  body: { error: 'bad_request' as const, message: 'Invalid room code format' },
};

/** Invalid since parameter response */
const INVALID_SINCE_RESPONSE = {
  status: 400,
  body: { error: 'bad_request' as const, message: 'Invalid since parameter' },
};

/**
 * Parse and validate the since query parameter.
 * Returns undefined if not provided, the number if valid, or null if invalid.
 */
function parseSince(query: unknown): number | undefined | null {
  if (query === undefined) {
    return undefined;
  }
  if (typeof query !== 'string') {
    return null;
  }
  const value = parseInt(query, 10);
  if (Number.isNaN(value) || value < 0) {
    return null;
  }
  return value;
}

/**
 * Send a handler result as HTTP response, logging errors.
 */
function sendResult(
  req: Request,
  res: Response,
  result: { status: number; body: unknown },
): void {
  if (result.status >= 400) {
    const body = result.body as ErrorResponse;
    logger.httpError(
      req.method,
      req.path,
      result.status,
      body.error,
      body.message,
    );
  }
  res.status(result.status).json(result.body);
}

/**
 * Configure routes on the given Express router.
 */
export function configureRoutes(
  router: Router,
  storage: SignalingStorage,
  rateLimiter: RateLimiter,
  config: Config,
): void {
  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // POST /rooms - Create a new room
  router.post('/rooms', async (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const result = await createRoom(
      storage,
      rateLimiter,
      config,
      clientIp,
      req.body,
    );
    sendResult(req, res, result);
  });

  // DELETE /rooms/:code - Delete a room
  router.delete('/rooms/:code', async (req: Request, res: Response) => {
    const code = getRoomCode(req);
    if (!code) {
      sendResult(req, res, INVALID_CODE_RESPONSE);
      return;
    }
    const result = await deleteRoom(storage, code, req.headers.authorization);
    sendResult(req, res, result);
  });

  // POST /rooms/:code/join - Join a room
  router.post('/rooms/:code/join', async (req: Request, res: Response) => {
    const code = getRoomCode(req);
    if (!code) {
      sendResult(req, res, INVALID_CODE_RESPONSE);
      return;
    }
    const clientIp = getClientIp(req);
    const result = await joinRoom(
      storage,
      rateLimiter,
      config,
      code,
      clientIp,
      req.body,
    );
    sendResult(req, res, result);
  });

  // POST /rooms/:code/leave - Leave a room
  router.post('/rooms/:code/leave', async (req: Request, res: Response) => {
    const code = getRoomCode(req);
    if (!code) {
      sendResult(req, res, INVALID_CODE_RESPONSE);
      return;
    }
    const result = await leaveRoom(storage, code, req.headers.authorization);
    sendResult(req, res, result);
  });

  // POST /rooms/:code/signals - Post a signal
  router.post('/rooms/:code/signals', async (req: Request, res: Response) => {
    const code = getRoomCode(req);
    if (!code) {
      sendResult(req, res, INVALID_CODE_RESPONSE);
      return;
    }
    const result = await postSignal(
      storage,
      rateLimiter,
      config,
      code,
      req.headers.authorization,
      req.body,
    );
    sendResult(req, res, result);
  });

  // GET /rooms/:code/signals - Get signals
  router.get('/rooms/:code/signals', async (req: Request, res: Response) => {
    const code = getRoomCode(req);
    if (!code) {
      sendResult(req, res, INVALID_CODE_RESPONSE);
      return;
    }
    const since = parseSince(req.query.since);
    if (since === null) {
      sendResult(req, res, INVALID_SINCE_RESPONSE);
      return;
    }
    const result = await getSignals(
      storage,
      code,
      req.headers.authorization,
      since,
    );
    sendResult(req, res, result);
  });

  // GET /rooms/:code/events - Get events
  router.get('/rooms/:code/events', async (req: Request, res: Response) => {
    const code = getRoomCode(req);
    if (!code) {
      sendResult(req, res, INVALID_CODE_RESPONSE);
      return;
    }
    const since = parseSince(req.query.since);
    if (since === null) {
      sendResult(req, res, INVALID_SINCE_RESPONSE);
      return;
    }
    const result = await getEvents(
      storage,
      code,
      req.headers.authorization,
      since,
    );
    sendResult(req, res, result);
  });

  // POST /rooms/:code/kick - Kick a player
  router.post('/rooms/:code/kick', async (req: Request, res: Response) => {
    const code = getRoomCode(req);
    if (!code) {
      sendResult(req, res, INVALID_CODE_RESPONSE);
      return;
    }
    const result = await kick(
      storage,
      code,
      req.headers.authorization,
      req.body,
    );
    sendResult(req, res, result);
  });

  // POST /rooms/:code/state - Set room state
  router.post('/rooms/:code/state', async (req: Request, res: Response) => {
    const code = getRoomCode(req);
    if (!code) {
      sendResult(req, res, INVALID_CODE_RESPONSE);
      return;
    }
    const result = await setState(
      storage,
      code,
      req.headers.authorization,
      req.body,
    );
    sendResult(req, res, result);
  });
}
