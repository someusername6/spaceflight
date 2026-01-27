/**
 * Lobby Actions - Functions that modify lobby state.
 *
 * All actions take LobbyContext as the first argument.
 * Actions may have side effects (UI updates, network sync).
 */

import {
  createChatMessageMessage,
  createPermissionUpdateMessage,
  createReadyStateMessage,
  lobbyPlayerToGamePlayer,
  processLobbyMessage,
} from '../../multiplayer/lobby-messages';
import type { LobbyState } from '../../multiplayer/lobby-state';
import {
  getMultiplayerContext,
  setMultiplayerContext,
} from '../../multiplayer/multiplayer-context';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import type { Permission } from '../../multiplayer/protocol/types';
import { updateLobbyState } from '../../ui/screens/lobby';
import {
  isSquadronUIActive,
  refreshSquadronUI,
} from '../../ui/screens/squadron';
import { isStoreUIActive, refreshStoreUI } from '../../ui/screens/store/store';
import type { CampaignState } from '../types';
import type { LobbyContext } from './lobby-context';

// =============================================================================
// UI Helpers
// =============================================================================

/**
 * Refresh the current campaign screen (store or squadron) with updated state.
 * Used when campaign state or permissions change.
 */
export function refreshCurrentScreen(campaignState: CampaignState): void {
  if (isStoreUIActive()) {
    refreshStoreUI(campaignState);
  } else if (isSquadronUIActive()) {
    refreshSquadronUI(campaignState);
  }
}

// =============================================================================
// State Updates (with side effects)
// =============================================================================

/**
 * Update lobby state and refresh UI.
 * Also updates multiplayer context if local player's permissions changed.
 */
export function setLobbyState(ctx: LobbyContext, newState: LobbyState): void {
  ctx.lobbyState = newState;
  updateLobbyState(newState);

  // Update multiplayer context if local player's permissions changed
  const localPlayer = newState.players.find(
    (p) => p.playerId === ctx.localPlayerId,
  );
  const mpContext = getMultiplayerContext();

  if (localPlayer && mpContext) {
    const permissionsChanged =
      mpContext.permissions.canBuy !== localPlayer.permissions.canBuy ||
      mpContext.permissions.canSell !== localPlayer.permissions.canSell ||
      mpContext.permissions.canConvertScrap !==
        localPlayer.permissions.canConvertScrap ||
      mpContext.permissions.shipEdit !== localPlayer.permissions.shipEdit;

    if (permissionsChanged) {
      setMultiplayerContext({
        ...mpContext,
        permissions: localPlayer.permissions,
      });

      // Refresh current screen to update button states
      if (ctx.campaignState) {
        refreshCurrentScreen(ctx.campaignState);
      }
    }
  }

  // Update player info in sync manager (host only)
  if (ctx.isHost) {
    for (const player of newState.players) {
      ctx.syncManager.setPlayerInfo(
        player.playerId,
        lobbyPlayerToGamePlayer(player),
      );
    }
  }
}

/**
 * Update campaign state and sync to all guests (host only).
 */
export function updateCampaignState(
  ctx: LobbyContext,
  newState: CampaignState,
): void {
  ctx.campaignState = newState;

  if (ctx.isHost) {
    ctx.syncManager.setCampaignState(newState);
    ctx.syncManager.syncCampaign();
  }
}

// =============================================================================
// User Actions
// =============================================================================

/**
 * Handle ready button toggle.
 */
export function toggleReady(ctx: LobbyContext, ready: boolean): void {
  const message = createReadyStateMessage(ctx.localPlayerId, ready);
  broadcastMessage(ctx, message);

  // Optimistic update
  const result = processLobbyMessage(
    ctx.lobbyState,
    message,
    ctx.isHost ? ctx.localPlayerId : '',
  );
  if (result) {
    setLobbyState(ctx, result.state);
  }
}

/**
 * Handle chat message send.
 */
export function sendChat(ctx: LobbyContext, text: string): void {
  const message = createChatMessageMessage(ctx.localPlayerId, text);
  broadcastMessage(ctx, message);

  // Optimistic update
  const result = processLobbyMessage(
    ctx.lobbyState,
    message,
    ctx.isHost ? ctx.localPlayerId : '',
  );
  if (result) {
    setLobbyState(ctx, result.state);
  }
}

/**
 * Handle permission change (host only).
 */
export function changePermissions(
  ctx: LobbyContext,
  playerId: string,
  permissions: Permission,
): void {
  // Only host can change permissions
  if (!ctx.isHost) return;

  // Don't allow changing host permissions
  const targetPlayer = ctx.lobbyState.players.find(
    (p) => p.playerId === playerId,
  );
  if (!targetPlayer || targetPlayer.isHost) return;

  const message = createPermissionUpdateMessage(playerId, permissions);
  broadcastMessage(ctx, message);

  // Optimistic update
  const result = processLobbyMessage(
    ctx.lobbyState,
    message,
    ctx.localPlayerId,
  );
  if (result) {
    setLobbyState(ctx, result.state);
  }
}

// =============================================================================
// Network Utilities
// =============================================================================

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
