/**
 * Shared broadcast utility for lobby message handlers.
 */

import {
  type MessageHandlerResult,
  processLobbyMessage,
} from '../../multiplayer/lobby-messages';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import type { LobbyContext } from './lobby-context';

/** Broadcast an encoded message to all connected peers. */
export function broadcastMessage(
  ctx: LobbyContext,
  message: Parameters<typeof encodeMessage>[0],
): void {
  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  const data = encodeMessage(message);
  transport.broadcast(data, true);
}

/**
 * Broadcast a lobby message and process it locally.
 * Returns the handler result (caller applies via setLobbyState).
 *
 * @param hostPeerId - The host's peer ID for message processing
 *   (use ctx.localPlayerId when host, '' when guest)
 */
export function broadcastAndProcess(
  ctx: LobbyContext,
  message: Parameters<typeof broadcastMessage>[1],
  hostPeerId: string,
): MessageHandlerResult | null {
  broadcastMessage(ctx, message);
  return processLobbyMessage(ctx.lobbyState, message, hostPeerId);
}
