/**
 * Create room handler.
 */

import { generateId, generateRoomCode, generateToken } from '../auth';
import type { HandlerResult, RouteContext } from '../router';
import {
  isDynamoDBThrottled,
  rateLimitedResponse,
  throttledResponse,
} from './utils';

const MAX_RETRIES = 3;

interface CreateRoomBody {
  gameVersion?: string;
}

export async function createRoom(ctx: RouteContext): Promise<HandlerResult> {
  // Rate limit check
  const rateLimit = await ctx.rateLimiter.checkCreate(ctx.clientIp);
  if (!rateLimit.allowed) {
    return rateLimitedResponse();
  }

  const body = ctx.body as CreateRoomBody | undefined;
  const gameVersion = body?.gameVersion ?? 'unknown';

  const hostId = generateId();
  const hostToken = generateToken();
  const now = Math.floor(Date.now() / 1000);

  // Retry loop for room code collisions
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const roomCode = generateRoomCode();

    try {
      // Create room
      await ctx.storage.createRoom({
        code: roomCode,
        hostId,
        gameVersion,
        state: 'lobby',
        createdAt: now,
        lastActivity: now,
        kickedCallsigns: [],
      });

      // Add host as first peer
      await ctx.storage.addPeer(roomCode, {
        id: hostId,
        token: hostToken,
        callsign: 'Host',
        joinedAt: now,
      });

      return {
        status: 200,
        body: { roomCode, hostId, hostToken },
      };
    } catch (error: unknown) {
      const errorName = (error as { name?: string }).name;

      // Room code collision - retry with new code
      if (errorName === 'ConditionalCheckFailedException') {
        continue;
      }

      // DynamoDB throttling
      if (isDynamoDBThrottled(error)) {
        return throttledResponse();
      }

      throw error;
    }
  }

  // Exhausted retries
  return {
    status: 503,
    body: { error: 'service_unavailable', message: 'Unable to create room' },
  };
}
