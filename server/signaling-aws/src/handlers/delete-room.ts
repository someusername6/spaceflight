/**
 * Delete room handler (host only).
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

export async function deleteRoom(
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
    // Get room to verify it exists and check host
    const room = await ctx.storage.getRoom(roomCode);
    if (!room) {
      return notFoundResponse('Room not found');
    }

    // Verify caller is host
    const peer = await ctx.storage.getPeerByToken(roomCode, token);
    if (!peer) {
      return unauthorizedResponse('Invalid token');
    }

    if (peer.id !== room.hostId) {
      return forbiddenResponse('Only the host can delete the room');
    }

    // Delete room and all associated data
    await ctx.storage.deleteRoom(roomCode);

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
