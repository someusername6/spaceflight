/**
 * Lobby State Synchronization - Manage lobby and campaign state.
 *
 * Extracted from lobby-handlers.ts to keep file under 400 lines.
 * Handles module state, getters/setters, and campaign synchronization.
 */

import type { CampaignSyncManager } from '../../multiplayer/campaign-sync';
import { lobbyPlayerToGamePlayer } from '../../multiplayer/lobby-messages';
import type { LobbyState } from '../../multiplayer/lobby-state';
import {
  getMultiplayerContext,
  setMultiplayerContext,
} from '../../multiplayer/multiplayer-context';
import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import type { MessageRouter } from '../../multiplayer/protocol/router';
import { updateLobbyState } from '../../ui/screens/lobby';
import {
  isSquadronUIActive,
  refreshSquadronUI,
} from '../../ui/screens/squadron';
import { isStoreUIActive, refreshStoreUI } from '../../ui/screens/store/store';
import type { CampaignState } from '../types';
import type { MessageHandlingResult } from './lobby-protocol-routing';

// =============================================================================
// Module State
// =============================================================================

/** Active connection flow */
let activeConnectionFlow: ConnectionFlow | null = null;

/** Current lobby state */
let lobbyState: LobbyState | null = null;

/** Current campaign state (for sending to guests) */
let activeCampaignState: CampaignState | null = null;

/** Message handling result (cleanup, router, syncManager) */
let messageHandlingResult: MessageHandlingResult | null = null;

/** Message router for protocol messages */
let messageRouter: MessageRouter | null = null;

/** Campaign sync manager */
let campaignSyncManager: CampaignSyncManager | null = null;

// =============================================================================
// State Getters
// =============================================================================

/** Get active connection flow */
export function getActiveConnectionFlow(): ConnectionFlow | null {
  return activeConnectionFlow;
}

/** Get current lobby state */
export function getLobbyState(): LobbyState | null {
  return lobbyState;
}

/** Get current campaign state */
export function getActiveCampaignState(): CampaignState | null {
  return activeCampaignState;
}

/** Get message router */
export function getMessageRouter(): MessageRouter | null {
  return messageRouter;
}

/** Get campaign sync manager */
export function getCampaignSyncManager(): CampaignSyncManager | null {
  return campaignSyncManager;
}

/** Check if in multiplayer lobby context */
export function isInLobby(): boolean {
  return lobbyState !== null;
}

// =============================================================================
// State Setters
// =============================================================================

/** Set active connection flow */
export function setActiveConnectionFlow(flow: ConnectionFlow | null): void {
  activeConnectionFlow = flow;
}

/** Set current campaign state */
export function setActiveCampaignState(state: CampaignState | null): void {
  activeCampaignState = state;
}

/** Set message handling result */
export function setMessageHandlingResult(
  result: MessageHandlingResult | null,
): void {
  messageHandlingResult = result;
  messageRouter = result?.router ?? null;
  campaignSyncManager = result?.syncManager ?? null;
}

/** Get message handling result (for cleanup) */
export function getMessageHandlingResult(): MessageHandlingResult | null {
  return messageHandlingResult;
}

/**
 * Set lobby state and update UI.
 * Also updates multiplayer context if local player's permissions changed.
 */
export function setLobbyState(state: LobbyState): void {
  lobbyState = state;
  updateLobbyState(state);

  // Update multiplayer context if local player's permissions changed
  const localPlayer = state.players.find(
    (p) => p.playerId === state.localPlayerId,
  );
  const context = getMultiplayerContext();
  if (localPlayer && context) {
    // Check if permissions changed
    const permissionsChanged =
      context.permissions.canBuy !== localPlayer.permissions.canBuy ||
      context.permissions.canSell !== localPlayer.permissions.canSell ||
      context.permissions.canConvertScrap !==
        localPlayer.permissions.canConvertScrap ||
      context.permissions.shipEdit !== localPlayer.permissions.shipEdit;

    if (permissionsChanged) {
      setMultiplayerContext({
        ...context,
        permissions: localPlayer.permissions,
      });

      // Refresh current screen to update button states based on new permissions
      if (activeCampaignState) {
        if (isStoreUIActive()) {
          refreshStoreUI(activeCampaignState);
        } else if (isSquadronUIActive()) {
          refreshSquadronUI(activeCampaignState);
        }
      }
    }
  }

  // Update player info in sync manager when permissions change
  if (campaignSyncManager && lobbyState?.isHost) {
    for (const player of state.players) {
      campaignSyncManager.setPlayerInfo(
        player.playerId,
        lobbyPlayerToGamePlayer(player),
      );
    }
  }
}

/** Internal setter for lobby state (without UI update) */
export function setLobbyStateInternal(state: LobbyState | null): void {
  lobbyState = state;
}

// =============================================================================
// Campaign State Synchronization
// =============================================================================

/**
 * Update campaign state and sync to all guests (host only).
 * Call this after any campaign state change (buy/sell/loadout).
 */
export function updateAndSyncCampaignState(newState: CampaignState): void {
  activeCampaignState = newState;
  if (campaignSyncManager && lobbyState?.isHost) {
    campaignSyncManager.setCampaignState(newState);
    campaignSyncManager.syncCampaign();
  }
}

// =============================================================================
// Cleanup
// =============================================================================

/** Clear all module state */
export function clearModuleState(): void {
  messageHandlingResult = null;
  messageRouter = null;
  campaignSyncManager = null;
  activeConnectionFlow = null;
  lobbyState = null;
  activeCampaignState = null;
}
