/**
 * Handler for POST /rooms - Create a new room.
 */

import { generatePeerId, generateToken } from '../auth.js';
import type { Config } from '../config.js';
import type { RateLimiter } from '../rate-limiter.js';
import { generateRoomCode } from '../room-code.js';
import type { SignalingStorage } from '../storage/types.js';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  ErrorResponse,
} from '../types.js';

const MAX_RETRIES = 5;

export interface CreateRoomResult {
  status: number;
  body: CreateRoomResponse | ErrorResponse;
}

export async function createRoom(
  storage: SignalingStorage,
  rateLimiter: RateLimiter,
  _config: Config,
  clientIp: string,
  request: CreateRoomRequest,
): Promise<CreateRoomResult> {
  // Rate limit check
  if (!rateLimiter.checkCreate(clientIp)) {
    return {
      status: 429,
      body: {
        error: 'rate_limited',
        message: 'Too many room creation attempts. Please wait a moment.',
      },
    };
  }

  // Validate request
  if (!request.gameVersion || typeof request.gameVersion !== 'string') {
    return {
      status: 400,
      body: {
        error: 'bad_request',
        message: 'gameVersion is required',
      },
    };
  }

  // Generate unique room code (with collision check)
  let code: string | null = null;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const candidate = generateRoomCode();
    const existing = await storage.getRoom(candidate);
    if (!existing) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    return {
      status: 500,
      body: {
        error: 'internal_error',
        message: 'Failed to generate unique room code',
      },
    };
  }

  const now = Date.now();
  const hostId = generatePeerId();
  const hostToken = generateToken();

  // Create the room
  await storage.createRoom({
    code,
    hostId,
    gameVersion: request.gameVersion,
    state: 'lobby',
    createdAt: now,
    lastActivity: now,
  });

  // Add host as first peer
  await storage.addPeer(code, {
    peerId: hostId,
    token: hostToken,
    joinedAt: now,
  });

  return {
    status: 201,
    body: {
      roomCode: code,
      hostId,
      hostToken,
    },
  };
}
