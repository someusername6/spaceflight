/**
 * Handler for POST /rooms/:code/signals - Post a WebRTC signal.
 */

import { extractBearerToken } from '../auth.js';
import type { Config } from '../config.js';
import type { RateLimiter } from '../rate-limiter.js';
import type { SignalingStorage } from '../storage/types.js';
import type {
  ErrorResponse,
  PostSignalRequest,
  SuccessResponse,
} from '../types.js';

export interface PostSignalResult {
  status: number;
  body: SuccessResponse | ErrorResponse;
}

const VALID_SIGNAL_TYPES = ['offer', 'answer', 'ice'] as const;

export async function postSignal(
  storage: SignalingStorage,
  rateLimiter: RateLimiter,
  config: Config,
  code: string,
  authHeader: string | undefined,
  request: PostSignalRequest,
): Promise<PostSignalResult> {
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
  if (!request.targetPeerId || typeof request.targetPeerId !== 'string') {
    return {
      status: 400,
      body: {
        error: 'bad_request',
        message: 'targetPeerId is required',
      },
    };
  }

  if (!request.type || !VALID_SIGNAL_TYPES.includes(request.type)) {
    return {
      status: 400,
      body: {
        error: 'bad_request',
        message: 'type must be one of: offer, answer, ice',
      },
    };
  }

  if (!request.data || typeof request.data !== 'string') {
    return {
      status: 400,
      body: {
        error: 'bad_request',
        message: 'data is required',
      },
    };
  }

  // Check signal data size (use byte length for accurate measurement)
  const dataByteLength = Buffer.byteLength(request.data, 'utf8');
  if (dataByteLength > config.maxSignalDataSize) {
    return {
      status: 400,
      body: {
        error: 'bad_request',
        message: `Signal data exceeds maximum size of ${config.maxSignalDataSize} bytes`,
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

  // Find sender peer by token
  const senderPeer = await storage.getPeerByToken(code, token);
  if (!senderPeer) {
    return {
      status: 401,
      body: {
        error: 'unauthorized',
        message: 'Invalid token',
      },
    };
  }

  // Check signal rate limit (20 signals/second per peer)
  if (!rateLimiter.checkSignal(code, senderPeer.peerId)) {
    return {
      status: 429,
      body: {
        error: 'rate_limited',
        message: 'Signal rate limit exceeded',
      },
    };
  }

  // Verify target peer exists
  const targetPeer = await storage.getPeer(code, request.targetPeerId);
  if (!targetPeer) {
    return {
      status: 400,
      body: {
        error: 'bad_request',
        message: 'Target peer not found in room',
      },
    };
  }

  const now = Date.now();

  // Add the signal
  await storage.addSignal(code, {
    fromPeerId: senderPeer.peerId,
    toPeerId: request.targetPeerId,
    type: request.type,
    data: request.data,
    timestamp: now,
  });

  // Update room activity
  await storage.updateRoom(code, { lastActivity: now });

  return {
    status: 200,
    body: { success: true },
  };
}
