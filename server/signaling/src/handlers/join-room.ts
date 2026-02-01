/**
 * Handler for POST /rooms/:code/join - Join an existing room.
 */

import { generatePeerId, generateToken } from '../auth.js';
import type { Config } from '../config.js';
import type { RateLimiter } from '../rate-limiter.js';
import type { SignalingStorage } from '../storage/types.js';
import type {
  ErrorResponse,
  JoinRoomRequest,
  JoinRoomResponse,
} from '../types.js';

export interface JoinRoomResult {
  status: number;
  body: JoinRoomResponse | ErrorResponse;
}

export async function joinRoom(
  storage: SignalingStorage,
  rateLimiter: RateLimiter,
  config: Config,
  code: string,
  clientIp: string,
  request: JoinRoomRequest,
): Promise<JoinRoomResult> {
  // Rate limit check
  if (!rateLimiter.checkJoin(clientIp)) {
    return {
      status: 429,
      body: {
        error: 'rate_limited',
        message: 'Too many join attempts. Please wait a moment.',
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

  // Check version match
  if (request.gameVersion !== room.gameVersion) {
    return {
      status: 409,
      body: {
        error: 'version_mismatch',
        message: `Game version mismatch. Room requires ${room.gameVersion}`,
      },
    };
  }

  // Check game state
  if (room.state === 'playing') {
    return {
      status: 409,
      body: {
        error: 'game_in_progress',
        message: 'Cannot join a game that is already in progress',
      },
    };
  }

  // Check if callsign has been kicked
  if (request.callsign && room.kickedCallsigns?.length) {
    const normalizedCallsign = request.callsign.toLowerCase();
    if (room.kickedCallsigns.includes(normalizedCallsign)) {
      return {
        status: 403,
        body: {
          error: 'callsign_kicked',
          message: 'This callsign has been kicked from the room',
        },
      };
    }
  }

  // Get existing peers
  const peers = await storage.getPeers(code);

  // Check room capacity
  if (peers.length >= config.maxPeersPerRoom) {
    return {
      status: 409,
      body: {
        error: 'room_full',
        message: `Room is full (max ${config.maxPeersPerRoom} players)`,
      },
    };
  }

  const now = Date.now();
  const guestId = generatePeerId();
  const guestToken = generateToken();

  // Add the new peer
  await storage.addPeer(code, {
    peerId: guestId,
    token: guestToken,
    joinedAt: now,
    callsign: request.callsign,
  });

  // Update room activity
  await storage.updateRoom(code, { lastActivity: now });

  // Add peer_joined event
  await storage.addEvent(code, {
    type: 'peer_joined',
    data: { peerId: guestId },
    timestamp: now,
  });

  // Build response with existing peers (for WebRTC connection)
  const existingPeers = peers.map((p) => ({
    peerId: p.peerId,
  }));

  return {
    status: 200,
    body: {
      guestId,
      guestToken,
      hostId: room.hostId,
      existingPeers,
    },
  };
}
