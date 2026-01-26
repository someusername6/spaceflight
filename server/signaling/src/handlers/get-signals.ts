/**
 * Handler for GET /rooms/:code/signals - Get pending signals.
 */

import { extractBearerToken } from '../auth.js';
import type { SignalingStorage } from '../storage/types.js';
import type { ErrorResponse, GetSignalsResponse } from '../types.js';

export interface GetSignalsResult {
  status: number;
  body: GetSignalsResponse | ErrorResponse;
}

export async function getSignals(
  storage: SignalingStorage,
  code: string,
  authHeader: string | undefined,
  since: number | undefined,
): Promise<GetSignalsResult> {
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

  // Get signals for this peer
  const signals = await storage.getSignals(code, peer.peerId, since);

  // Update room activity
  await storage.updateRoom(code, { lastActivity: now });

  return {
    status: 200,
    body: {
      signals: signals.map((s) => ({
        fromPeerId: s.fromPeerId,
        type: s.type,
        data: s.data,
        timestamp: s.timestamp,
      })),
    },
  };
}
