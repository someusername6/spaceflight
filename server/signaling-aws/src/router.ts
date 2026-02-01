/**
 * Request router for AWS signaling server.
 * Matches incoming requests to handler functions.
 */

import type { Config } from './config';
import * as handlers from './handlers';
import type { RateLimiter } from './rate-limiter/dynamodb-rate-limiter';
import type { SignalingStorage } from './storage/types';

export interface RouteContext {
  method: string;
  path: string;
  clientIp: string;
  authorization?: string;
  body?: unknown;
  query: Record<string, string | undefined>;
  storage: SignalingStorage;
  rateLimiter: RateLimiter;
  config: Config;
}

export interface HandlerResult {
  status: number;
  body: unknown;
}

export type HandlerFn = (
  ctx: RouteContext,
  roomCode?: string,
) => Promise<HandlerResult>;

// Route table with case-insensitive patterns
const routes: Array<{ method: string; pattern: RegExp; handler: HandlerFn }> = [
  {
    method: 'GET',
    pattern: /^\/health$/i,
    handler: handlers.health,
  },
  {
    method: 'POST',
    pattern: /^\/rooms$/i,
    handler: handlers.createRoom,
  },
  {
    method: 'DELETE',
    pattern: /^\/rooms\/([A-Za-z0-9]{8})$/i,
    handler: handlers.deleteRoom,
  },
  {
    method: 'POST',
    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/join$/i,
    handler: handlers.joinRoom,
  },
  {
    method: 'POST',
    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/leave$/i,
    handler: handlers.leaveRoom,
  },
  {
    method: 'POST',
    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/signals$/i,
    handler: handlers.postSignal,
  },
  {
    method: 'GET',
    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/signals$/i,
    handler: handlers.getSignals,
  },
  {
    method: 'GET',
    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/events$/i,
    handler: handlers.getEvents,
  },
  {
    method: 'POST',
    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/kick$/i,
    handler: handlers.kick,
  },
  {
    method: 'POST',
    pattern: /^\/rooms\/([A-Za-z0-9]{8})\/state$/i,
    handler: handlers.setState,
  },
];

/**
 * Route a request to the appropriate handler.
 */
export async function route(ctx: RouteContext): Promise<HandlerResult> {
  for (const r of routes) {
    if (ctx.method !== r.method) continue;
    const match = ctx.path.match(r.pattern);
    if (!match) continue;

    // Normalize room code to uppercase (if present)
    const roomCode = match[1]?.toUpperCase();
    return r.handler(ctx, roomCode);
  }

  return {
    status: 404,
    body: { error: 'not_found', message: 'Route not found' },
  };
}
