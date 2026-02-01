/**
 * Set room state handler (host only).
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

interface SetStateBody {
  state?: string;
}

export async function setState(
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
      return forbiddenResponse('Only the host can set room state');
    }

    // Validate body
    const body = ctx.body as SetStateBody | undefined;
    if (!body?.state) {
      return badRequestResponse('state is required');
    }

    // Update room state
    await ctx.storage.updateRoom(roomCode, {
      state: body.state,
      lastActivity: Math.floor(Date.now() / 1000),
    });

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
