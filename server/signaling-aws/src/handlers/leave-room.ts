/**
 * Leave room handler.
 */

import type { HandlerResult, RouteContext } from '../router';
import {
  badRequestResponse,
  extractToken,
  isDynamoDBThrottled,
  throttledResponse,
  unauthorizedResponse,
} from './utils';

export async function leaveRoom(
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
    // Find peer by token
    const peer = await ctx.storage.getPeerByToken(roomCode, token);
    if (!peer) {
      return unauthorizedResponse('Invalid token');
    }

    // Remove peer
    await ctx.storage.removePeer(roomCode, peer.id);

    return {
      status: 200,
      body: { success: true },
    };
  } catch (error: unknown) {
    if (isDynamoDBThrottled(error)) {
      return throttledResponse();
    }
    throw error;
  }
}
