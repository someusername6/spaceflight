/**
 * Get events handler (host only).
 */

import type { HandlerResult, RouteContext } from '../router';
import {
  badRequestResponse,
  extractToken,
  forbiddenResponse,
  isDynamoDBThrottled,
  notFoundResponse,
  throttledResponse,
  unauthorizedResponse,
} from './utils';

export async function getEvents(
  ctx: RouteContext,
  roomCode?: string,
): Promise<HandlerResult> {
  if (!roomCode) {
    return badRequestResponse('Room code required');
  }

  // Extract and validate token
  const token = extractToken(ctx.authorization);
  if (!token) {
    return unauthorizedResponse('Bearer token required');
  }

  try {
    // Get room to check host
    const room = await ctx.storage.getRoom(roomCode);
    if (!room) {
      return notFoundResponse('Room not found');
    }

    // Validate caller is host
    const peer = await ctx.storage.getPeerByToken(roomCode, token);
    if (!peer) {
      return unauthorizedResponse('Invalid token');
    }

    if (peer.id !== room.hostId) {
      return forbiddenResponse('Only the host can get events');
    }

    // Parse since parameter (defaults to 0)
    let since = 0;
    if (ctx.query.since) {
      const parsed = parseInt(ctx.query.since, 10);
      if (!Number.isNaN(parsed)) {
        // If client sends milliseconds, convert to seconds
        since = parsed > 1e12 ? Math.floor(parsed / 1000) : parsed;
      }
    }

    // Get events
    const events = await ctx.storage.getEvents(roomCode, since);

    return {
      status: 200,
      body: { events },
    };
  } catch (error: unknown) {
    if (isDynamoDBThrottled(error)) {
      return throttledResponse();
    }
    throw error;
  }
}
