/**
 * Join room handler.
 */

import { generateId, generateToken } from '../auth';
import type { HandlerResult, RouteContext } from '../router';
import {
  badRequestResponse,
  forbiddenResponse,
  isDynamoDBThrottled,
  notFoundResponse,
  rateLimitedResponse,
  throttledResponse,
} from './utils';

interface JoinRoomBody {
  callsign?: string;
}

export async function joinRoom(
  ctx: RouteContext,
  roomCode?: string,
): Promise<HandlerResult> {
  if (!roomCode) {
    return badRequestResponse('Room code required');
  }

  // Rate limit check
  const rateLimit = await ctx.rateLimiter.checkJoin(ctx.clientIp);
  if (!rateLimit.allowed) {
    return rateLimitedResponse();
  }

  try {
    // Get room
    const room = await ctx.storage.getRoom(roomCode);
    if (!room) {
      return notFoundResponse('Room not found');
    }

    // Get body
    const body = ctx.body as JoinRoomBody | undefined;
    const callsign = body?.callsign ?? 'Guest';

    // Check if callsign is kicked
    if (room.kickedCallsigns.includes(callsign)) {
      return forbiddenResponse('Callsign has been kicked from this room');
    }

    // Check max peers
    const peers = await ctx.storage.listPeers(roomCode);
    if (peers.length >= ctx.config.maxPeersPerRoom) {
      return forbiddenResponse('Room is full');
    }

    // Create guest peer
    const guestId = generateId();
    const guestToken = generateToken();
    const now = Math.floor(Date.now() / 1000);

    await ctx.storage.addPeer(roomCode, {
      id: guestId,
      token: guestToken,
      callsign,
      joinedAt: now,
    });

    // Get existing peer IDs (excluding the new guest)
    const existingPeers = peers.map((p) => p.id);

    return {
      status: 200,
      body: {
        guestId,
        guestToken,
        hostId: room.hostId,
        existingPeers,
      },
    };
  } catch (error: unknown) {
    if (isDynamoDBThrottled(error)) {
      return throttledResponse();
    }
    throw error;
  }
}
