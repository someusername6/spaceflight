/**
 * Handler for POST /rooms/:code/state - Set the room state.
 */

import { extractBearerToken } from '../auth.js';
import type { SignalingStorage } from '../storage/types.js';
import type {
  ErrorResponse,
  SetStateRequest,
  SuccessResponse,
} from '../types.js';

export interface SetStateResult {
  status: number;
  body: SuccessResponse | ErrorResponse;
}

const VALID_STATES = ['lobby', 'playing'] as const;

export async function setState(
  storage: SignalingStorage,
  code: string,
  authHeader: string | undefined,
  request: SetStateRequest,
): Promise<SetStateResult> {
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
  if (!request.state || !VALID_STATES.includes(request.state)) {
    return {
      status: 400,
      body: {
        error: 'bad_request',
        message: 'state must be one of: lobby, playing',
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
        message: 'Only the host can change room state',
      },
    };
  }

  const now = Date.now();

  // Update room state
  await storage.updateRoom(code, {
    state: request.state,
    lastActivity: now,
  });

  // Add game_started event if transitioning to playing
  if (request.state === 'playing' && room.state !== 'playing') {
    await storage.addEvent(code, {
      type: 'game_started',
      data: {},
      timestamp: now,
    });
  }

  return {
    status: 200,
    body: { success: true },
  };
}
