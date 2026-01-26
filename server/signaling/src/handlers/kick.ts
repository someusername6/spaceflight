/**
 * Handler for POST /rooms/:code/kick - Kick a player from the room.
 */

import { extractBearerToken } from '../auth.js';
import type { SignalingStorage } from '../storage/types.js';
import type { ErrorResponse, KickRequest, SuccessResponse } from '../types.js';

export interface KickResult {
  status: number;
  body: SuccessResponse | ErrorResponse;
}

export async function kick(
  storage: SignalingStorage,
  code: string,
  authHeader: string | undefined,
  request: KickRequest,
): Promise<KickResult> {
  // Extract token
  const token = extractBearerToken(authHeader);
  if (!token) {
    return {
      status: 401,
      body: {
        error: 'unauthorized',
        message: 'Authorization header with bearer token required',
      },
    };
  }

  // Validate request
  if (!request.peerId || typeof request.peerId !== 'string') {
    return {
      status: 400,
      body: {
        error: 'bad_request',
        message: 'peerId is required',
      },
    };
  }

  // Get room
  const room = await storage.getRoom(code);
  if (!room) {
    return {
      status: 404,
      body: {
        error: 'invalid_room',
        message: 'Room not found',
      },
    };
  }

  // Verify caller is the host
  const hostPeer = await storage.getPeerByToken(code, token);
  if (!hostPeer || hostPeer.peerId !== room.hostId) {
    return {
      status: 403,
      body: {
        error: 'forbidden',
        message: 'Only the host can kick players',
      },
    };
  }

  // Don't allow host to kick themselves
  if (request.peerId === room.hostId) {
    return {
      status: 400,
      body: {
        error: 'bad_request',
        message: 'Cannot kick yourself',
      },
    };
  }

  // Verify the peer exists in the room
  const peer = await storage.getPeer(code, request.peerId);
  if (!peer) {
    return {
      status: 400,
      body: {
        error: 'bad_request',
        message: 'Player not found in room',
      },
    };
  }

  const now = Date.now();

  // Remove the peer
  await storage.removePeer(code, request.peerId);

  // Add peer_kicked event
  await storage.addEvent(code, {
    type: 'peer_kicked',
    data: { peerId: request.peerId },
    timestamp: now,
  });

  // Update room activity
  await storage.updateRoom(code, { lastActivity: now });

  return {
    status: 200,
    body: { success: true },
  };
}
