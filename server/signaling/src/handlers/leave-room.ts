/**
 * Handler for POST /rooms/:code/leave - Leave a room.
 */

import { extractBearerToken } from '../auth.js';
import type { SignalingStorage } from '../storage/types.js';
import type { ErrorResponse, SuccessResponse } from '../types.js';

export interface LeaveRoomResult {
  status: number;
  body: SuccessResponse | ErrorResponse;
}

export async function leaveRoom(
  storage: SignalingStorage,
  code: string,
  authHeader: string | undefined,
): Promise<LeaveRoomResult> {
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

  // Find peer by token
  const peer = await storage.getPeerByToken(code, token);
  if (!peer) {
    return {
      status: 401,
      body: {
        error: 'unauthorized',
        message: 'Invalid token',
      },
    };
  }

  const now = Date.now();

  // If host is leaving, delete the entire room
  if (peer.peerId === room.hostId) {
    await storage.deleteRoom(code);
  } else {
    // Remove the peer
    await storage.removePeer(code, peer.peerId);

    // Add peer_left event
    await storage.addEvent(code, {
      type: 'peer_left',
      data: { peerId: peer.peerId },
      timestamp: now,
    });

    // Update room activity
    await storage.updateRoom(code, { lastActivity: now });
  }

  return {
    status: 200,
    body: { success: true },
  };
}
