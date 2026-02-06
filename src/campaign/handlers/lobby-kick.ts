/**
 * Lobby Kick - Player kick functionality for host.
 *
 * Extracted from lobby-actions.ts to keep file under 400 lines.
 */

import { encodeMessage } from '../../multiplayer/protocol/encode';
import {
  GameMessageType,
  type LeaveReason,
} from '../../multiplayer/protocol/types';
import { setLobbyState } from './lobby-actions';
import { broadcastAndProcess } from './lobby-broadcast';
import type { LobbyContext } from './lobby-context';

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
  const result = broadcastAndProcess(ctx, playerLeftMsg, ctx.localPlayerId);
  if (result) {
    setLobbyState(ctx, result.state);
  }
}
