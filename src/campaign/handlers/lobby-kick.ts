/**
 * Lobby Kick - Player kick functionality for host.
 *
 * Extracted from lobby-actions.ts to keep file under 400 lines.
 */

import { processLobbyMessage } from '../../multiplayer/lobby-messages';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import {
  GameMessageType,
  type LeaveReason,
} from '../../multiplayer/protocol/types';
import { setLobbyState } from './lobby-actions';
import type { LobbyContext } from './lobby-context';

/**
 * Broadcast a game message to all connected peers.
 */
function broadcastMessage(
  ctx: LobbyContext,
  message: Parameters<typeof encodeMessage>[0],
): void {
  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  const data = encodeMessage(message);
  transport.broadcast(data, true);
}

/**
 * Broadcast a lobby message and optimistically apply it locally.
 */
function broadcastAndApply(
  ctx: LobbyContext,
  message: Parameters<typeof encodeMessage>[0],
  hostPeerId: string,
): void {
  broadcastMessage(ctx, message);
  const result = processLobbyMessage(ctx.lobbyState, message, hostPeerId);
  if (result) {
    setLobbyState(ctx, result.state);
  }
}

/**
 * Kick a player from the lobby (host only).
 * Sends KickNotification to the kicked player, then broadcasts PlayerLeftExt.
 */
export async function kickPlayer(
  ctx: LobbyContext,
  playerId: string,
): Promise<void> {
  if (!ctx.isHost) return;

  // Don't allow host to kick themselves
  if (playerId === ctx.localPlayerId) return;

  const targetPlayer = ctx.lobbyState.players.find(
    (p) => p.playerId === playerId,
  );
  if (!targetPlayer) return;

  // Send KickNotification to the player being kicked
  const transport = ctx.connectionFlow.getTransport();
  if (transport) {
    const kickMsg = encodeMessage({
      type: GameMessageType.KickNotification,
      reason: 'Kicked by host',
    });
    transport.send(playerId, kickMsg, true);
  }

  // Call signaling server kick endpoint
  const signalingClient = ctx.connectionFlow.getSignalingClient();
  if (signalingClient) {
    try {
      await signalingClient.kick(playerId);
    } catch (error) {
      console.warn('[kickPlayer] Failed to kick via signaling:', error);
    }
  }

  // Broadcast PlayerLeftExt with 'kicked' reason to all remaining players
  const playerLeftMsg = {
    type: GameMessageType.PlayerLeftExt as const,
    playerId,
    reason: 'kicked' as LeaveReason,
  };
  broadcastAndApply(ctx, playerLeftMsg, ctx.localPlayerId);
}
