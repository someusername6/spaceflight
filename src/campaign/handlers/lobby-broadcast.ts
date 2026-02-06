/**
 * Shared broadcast utility for lobby message handlers.
 */

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
