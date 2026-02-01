/**
 * Get signals handler.
 */

import type { HandlerResult, RouteContext } from '../router';
import {
  badRequestResponse,
  extractToken,
  isDynamoDBThrottled,
  throttledResponse,
  unauthorizedResponse,
} from './utils';

export async function getSignals(
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
    // Validate caller is a peer in the room
    const peer = await ctx.storage.getPeerByToken(roomCode, token);
    if (!peer) {
      return unauthorizedResponse('Invalid token');
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

    // Get signals addressed to this peer
    const signals = await ctx.storage.getSignals(roomCode, peer.id, since);

    return {
      status: 200,
      body: { signals },
    };
  } catch (error: unknown) {
    if (isDynamoDBThrottled(error)) {
      return throttledResponse();
    }
    throw error;
  }
}
