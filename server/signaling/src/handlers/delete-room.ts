/**
 * Handler for DELETE /rooms/:code - Delete a room.
 */

import { extractBearerToken } from '../auth.js';
import type { SignalingStorage } from '../storage/types.js';
import type { ErrorResponse, SuccessResponse } from '../types.js';

export interface DeleteRoomResult {
  status: number;
  body: SuccessResponse | ErrorResponse;
}

export async function deleteRoom(
  storage: SignalingStorage,
  code: string,
  authHeader: string | undefined,
): Promise<DeleteRoomResult> {
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

  // Verify caller is the host
  const peer = await storage.getPeerByToken(code, token);
  if (!peer || peer.peerId !== room.hostId) {
    return {
      status: 403,
      body: {
        error: 'forbidden',
        message: 'Only the host can delete the room',
      },
    };
  }

  // Delete the room
  await storage.deleteRoom(code);

  return {
    status: 200,
    body: { success: true },
  };
}
