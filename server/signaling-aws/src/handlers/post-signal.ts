/**
 * Post signal handler.
 */

import type { HandlerResult, RouteContext } from '../router';
import {
  badRequestResponse,
  extractToken,
  isDynamoDBThrottled,
  rateLimitedResponse,
  throttledResponse,
  unauthorizedResponse,
} from './utils';

interface PostSignalBody {
  toPeerId?: string;
  type?: string;
  data?: unknown;
}

export async function postSignal(
  ctx: RouteContext,
  roomCode?: string,
): Promise<HandlerResult> {
  if (!roomCode) {
    return badRequestResponse('Room code required');
  }

  // Extract and validate token
  const token = extractToken(ctx.authorization);
  if (!token) {
    return unauthorizedResponse('Bearer token required');
  }

  try {
    // Validate caller is a peer in the room
    const peer = await ctx.storage.getPeerByToken(roomCode, token);
    if (!peer) {
      return unauthorizedResponse('Invalid token');
    }

    // Rate limit check (per peer)
    const rateLimit = await ctx.rateLimiter.checkSignal(roomCode, peer.id);
    if (!rateLimit.allowed) {
      return rateLimitedResponse();
    }

    // Validate body
    const body = ctx.body as PostSignalBody | undefined;
    if (!body?.toPeerId || !body.type) {
      return badRequestResponse('toPeerId and type are required');
    }

    // Add signal
    await ctx.storage.addSignal(roomCode, {
      fromPeerId: peer.id,
      toPeerId: body.toPeerId,
      type: body.type,
      data: body.data,
    });

    return {
      status: 200,
      body: { success: true },
    };
  } catch (error: unknown) {
    if (isDynamoDBThrottled(error)) {
      return throttledResponse();
    }
    throw error;
  }
}
