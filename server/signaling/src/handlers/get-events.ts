/**
 * Handler for GET /rooms/:code/events - Get room events.
 */

import { extractBearerToken } from '../auth.js';
import type { SignalingStorage } from '../storage/types.js';
import type { ErrorResponse, GetEventsResponse } from '../types.js';

export interface GetEventsResult {
  status: number;
  body: GetEventsResponse | ErrorResponse;
}

export async function getEvents(
  storage: SignalingStorage,
  code: string,
  authHeader: string | undefined,
  since: number | undefined,
): Promise<GetEventsResult> {
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

  // Get events
  const events = await storage.getEvents(code, since);

  // Update room activity
  await storage.updateRoom(code, { lastActivity: now });

  return {
    status: 200,
    body: { events },
  };
}
