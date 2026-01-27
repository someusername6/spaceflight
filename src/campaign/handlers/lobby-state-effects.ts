/**
 * Lobby State Effects - Side effects when lobby state changes.
 *
 * Handles:
 * - UI refresh when permissions change
 * - Campaign state sync to guests
 * - Multiplayer context updates
 */

import { lobbyPlayerToGamePlayer } from '../../multiplayer/lobby-messages';
import type { LobbyState } from '../../multiplayer/lobby-state';
import {
  getMultiplayerContext,
  setMultiplayerContext,
} from '../../multiplayer/multiplayer-context';
import { updateLobbyState } from '../../ui/screens/lobby';
import {
  isSquadronUIActive,
  refreshSquadronUI,
} from '../../ui/screens/squadron';
import { isStoreUIActive, refreshStoreUI } from '../../ui/screens/store/store';
import type { CampaignState } from '../types';
import {
  getActiveCampaignState,
  getCampaignSyncManager,
  getLobbyState,
  setActiveCampaignStateInternal,
  setLobbyStateInternal,
} from './lobby-state-holder';

// =============================================================================
// Lobby State Updates (with side effects)
// =============================================================================

/**
 * Set lobby state and update UI.
 * Also updates multiplayer context if local player's permissions changed.
 */
export function setLobbyState(state: LobbyState): void {
  setLobbyStateInternal(state);
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
      const activeCampaignState = getActiveCampaignState();
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
  const campaignSyncManager = getCampaignSyncManager();
  const lobbyState = getLobbyState();
  if (campaignSyncManager && lobbyState?.isHost) {
    for (const player of state.players) {
      campaignSyncManager.setPlayerInfo(
        player.playerId,
        lobbyPlayerToGamePlayer(player),
      );
    }
  }
}

// =============================================================================
// Campaign State Synchronization
// =============================================================================

/**
 * Update campaign state and sync to all guests (host only).
 * Call this after any campaign state change (buy/sell/loadout).
 */
export function updateAndSyncCampaignState(newState: CampaignState): void {
  setActiveCampaignStateInternal(newState);
  const campaignSyncManager = getCampaignSyncManager();
  const lobbyState = getLobbyState();
  if (campaignSyncManager && lobbyState?.isHost) {
    campaignSyncManager.setCampaignState(newState);
    campaignSyncManager.syncCampaign();
  }
}
