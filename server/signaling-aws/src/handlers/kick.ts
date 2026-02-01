/**
 * Kick peer handler (host only).
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

interface KickBody {
  peerId?: string;
}

export async function kick(
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
    const callerPeer = await ctx.storage.getPeerByToken(roomCode, token);
    if (!callerPeer) {
      return unauthorizedResponse('Invalid token');
    }

    if (callerPeer.id !== room.hostId) {
      return forbiddenResponse('Only the host can kick peers');
    }

    // Validate body
    const body = ctx.body as KickBody | undefined;
    if (!body?.peerId) {
      return badRequestResponse('peerId is required');
    }

    // Can't kick yourself
    if (body.peerId === room.hostId) {
      return badRequestResponse('Cannot kick the host');
    }

    // Get target peer to get their callsign
    const targetPeer = await ctx.storage.getPeer(roomCode, body.peerId);
    if (!targetPeer) {
      return notFoundResponse('Peer not found');
    }

    // Kick the peer (atomic operation)
    await ctx.storage.kickPeer(roomCode, body.peerId, targetPeer.callsign);

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
