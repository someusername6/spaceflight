/**
 * Lobby Actions - Functions that modify lobby state.
 *
 * All actions take LobbyContext as the first argument.
 * Actions may have side effects (UI updates, network sync).
 */

import {
  isCallsignConflict,
  setStoredCallsign,
  validateCallsign,
} from '../../multiplayer/callsign-storage';
import { validateChatMessage } from '../../multiplayer/chat-validation';
import { createAutoaimUpdateMessage } from '../../multiplayer/lobby-message-utils';
import {
  createCallsignUpdateMessage,
  createChatMessage,
  createPermissionUpdateMessage,
  createReadyStateMessage,
  createShipAssignmentMessage,
  lobbyPlayerToGamePlayer,
} from '../../multiplayer/lobby-messages';
import {
  type LobbyState,
  setErrorMessage,
  setPlayerAutoaimDegrees,
} from '../../multiplayer/lobby-state';
import {
  getMultiplayerContext,
  setMultiplayerContext,
} from '../../multiplayer/multiplayer-context';
import type { Permission } from '../../multiplayer/protocol/types';
import type { PlayerAutoaim } from '../../settings/game-settings';
import {
  isContractsUIActive,
  refreshContractsUI,
} from '../../ui/screens/contracts';
import {
  updateLobbyCampaignInfo,
  updateLobbyState,
} from '../../ui/screens/lobby';
import { updateResultsChatMessages } from '../../ui/screens/results/results';
import {
  isSquadronUIActive,
  refreshSquadronUI,
} from '../../ui/screens/squadron';
import { isStoreUIActive, refreshStoreUI } from '../../ui/screens/store/store';
import type { CampaignState } from '../types';
import { broadcastAndProcess, broadcastMessage } from './lobby-broadcast';
import { getLobbyContext, type LobbyContext } from './lobby-context';
import {
  detectMissingShipAssignments,
  detectPlayerPilotChanges,
} from './lobby-sync-detection';

// =============================================================================
// UI Helpers
// =============================================================================

/**
 * Refresh the current campaign screen (store or squadron) with updated state.
 * Also updates lobby nav bar campaign info (credits/sector).
 * Used when campaign state or permissions change.
 */
export function refreshCurrentScreen(campaignState: CampaignState): void {
  if (isStoreUIActive()) {
    refreshStoreUI(campaignState);
  } else if (isSquadronUIActive()) {
    refreshSquadronUI(campaignState);
  } else if (isContractsUIActive()) {
    refreshContractsUI(campaignState);
  }

  // Always keep lobby nav bar credits/sector up to date
  updateLobbyCampaignInfo(campaignState.credits, campaignState.currentSector);
}

// =============================================================================
// State Updates (with side effects)
// =============================================================================

/**
 * Sync local player's permissions and shipId to the multiplayer context.
 * Returns true if context was updated, false otherwise.
 */
function syncLocalPlayerContext(
  ctx: LobbyContext,
  newState: LobbyState,
): boolean {
  const localPlayer = newState.players.find(
    (p) => p.playerId === ctx.localPlayerId,
  );
  const mpContext = getMultiplayerContext();

  if (!localPlayer || !mpContext) return false;

  const permissionsChanged =
    mpContext.permissions.canBuy !== localPlayer.permissions.canBuy ||
    mpContext.permissions.canSell !== localPlayer.permissions.canSell ||
    mpContext.permissions.canConvertScrap !==
      localPlayer.permissions.canConvertScrap ||
    mpContext.permissions.shipEdit !== localPlayer.permissions.shipEdit;

  const shipIdChanged = mpContext.assignedShipId !== localPlayer.shipId;

  if (permissionsChanged || shipIdChanged) {
    setMultiplayerContext({
      ...mpContext,
      permissions: localPlayer.permissions,
      assignedShipId: localPlayer.shipId,
    });
    return true;
  }
  return false;
}

/**
 * Sync player info to the sync manager (host only).
 */
function syncPlayerInfoToManager(
  ctx: LobbyContext,
  newState: LobbyState,
): void {
  for (const player of newState.players) {
    ctx.syncManager.setPlayerInfo(
      player.playerId,
      lobbyPlayerToGamePlayer(player),
    );
  }
}

/**
 * Update lobby state and refresh UI.
 * Also updates multiplayer context if local player's permissions or shipId changed.
 */
export function setLobbyState(ctx: LobbyContext, newState: LobbyState): void {
  ctx.lobbyState = newState;
  updateLobbyState(newState);

  // Update results chat if in debrief mode
  if (ctx.debriefState?.missionComplete) {
    updateResultsChatMessages(newState.chatMessages);
  }

  const contextUpdated = syncLocalPlayerContext(ctx, newState);
  if (contextUpdated && ctx.screenManager.campaignState) {
    refreshCurrentScreen(ctx.screenManager.campaignState);
  }

  if (ctx.isHost) {
    syncPlayerInfoToManager(ctx, newState);
  }
}

/**
 * Sync campaign state to all guests (host only).
 * screenManager is the single source of truth — it is already updated
 * by the caller via screens.updateCampaignState(). This function only
 * pushes the state to the sync manager for network distribution.
 *
 * Also detects player pilot assignment changes and sends ShipAssignment
 * messages to keep lobby state in sync with campaign state.
 */
export function syncCampaignState(
  ctx: LobbyContext,
  newState: CampaignState,
  oldState?: CampaignState | null,
): void {
  if (!ctx.isHost) return;

  // Detect and broadcast player pilot assignment changes (for player pilots in campaign state)
  const changes = detectPlayerPilotChanges(oldState ?? null, newState);
  for (const change of changes) {
    const msg = createShipAssignmentMessage(change.playerId, change.shipId);
    broadcastAndApply(ctx, msg);
  }

  // Detect lobby players whose assigned ship was removed from campaign state
  // (e.g., ship moved to storage via squadron screen unassign)
  const missingPlayers = detectMissingShipAssignments(ctx, newState);
  for (const playerId of missingPlayers) {
    const msg = createShipAssignmentMessage(playerId, null);
    broadcastAndApply(ctx, msg);
  }

  ctx.syncManager.setCampaignState(newState);
  ctx.syncManager.syncCampaign();
}

/**
 * Sync campaign state to all guests (host only).
 * Wrapper that gets context and calls the action.
 *
 * @param newState - The updated campaign state
 * @param oldState - The previous campaign state (for detecting player pilot unassignments)
 */
export function updateAndSyncCampaignState(
  newState: CampaignState,
  oldState?: CampaignState | null,
): void {
  const ctx = getLobbyContext();
  if (ctx) {
    syncCampaignState(ctx, newState, oldState);
  }
}

// =============================================================================
// User Actions
// =============================================================================

/** Broadcast a lobby message and optimistically apply it locally. */
function broadcastAndApply(
  ctx: LobbyContext,
  message: Parameters<typeof broadcastMessage>[1],
): void {
  const result = broadcastAndProcess(
    ctx,
    message,
    ctx.isHost ? ctx.localPlayerId : '',
  );
  if (result) {
    setLobbyState(ctx, result.state);
  }
}

/**
 * Handle ready button toggle.
 */
export function toggleReady(ctx: LobbyContext, ready: boolean): void {
  broadcastAndApply(ctx, createReadyStateMessage(ctx.localPlayerId, ready));
}

/**
 * Auto-unready the local player if they're ready.
 * Called on loadout changes, ship reassignment, etc.
 */
export function autoUnreadyIfNeeded(ctx: LobbyContext): void {
  const localPlayer = ctx.lobbyState.players.find(
    (p) => p.playerId === ctx.localPlayerId,
  );
  if (localPlayer?.isReady) {
    toggleReady(ctx, false);
  }
}

/**
 * Convenience wrapper that gets context and calls autoUnreadyIfNeeded.
 * Use from UI code that doesn't have direct access to LobbyContext.
 */
export function triggerAutoUnready(): void {
  const ctx = getLobbyContext();
  if (ctx) {
    autoUnreadyIfNeeded(ctx);
  }
}

/**
 * Handle chat message send.
 * Validates message length and rate limits.
 */
export function sendChat(ctx: LobbyContext, text: string): void {
  const validation = validateChatMessage(ctx.localPlayerId, text);
  if (!validation.valid) {
    setLobbyState(ctx, setErrorMessage(ctx.lobbyState, validation.error ?? ''));
    return;
  }
  broadcastAndApply(ctx, createChatMessage(ctx.localPlayerId, text));
}

/**
 * Handle permission change (host only).
 */
export function changePermissions(
  ctx: LobbyContext,
  playerId: string,
  permissions: Permission,
): void {
  if (!ctx.isHost) return;

  const targetPlayer = ctx.lobbyState.players.find(
    (p) => p.playerId === playerId,
  );
  if (!targetPlayer || targetPlayer.isHost) return;

  broadcastAndApply(ctx, createPermissionUpdateMessage(playerId, permissions));
}

/**
 * Handle callsign change.
 * Returns validation result: true if change was broadcast, false if rejected.
 */
export function changeCallsign(
  ctx: LobbyContext,
  newCallsign: string,
): { success: boolean; error?: string } {
  const trimmed = newCallsign.trim();

  // Validate callsign format
  const validation = validateCallsign(trimmed);
  if (!validation.valid) {
    const error = validation.error ?? 'Invalid callsign';
    setLobbyState(ctx, setErrorMessage(ctx.lobbyState, error));
    return { success: false, error };
  }

  // Check for conflicts (case-insensitive)
  if (isCallsignConflict(ctx.lobbyState.players, trimmed, ctx.localPlayerId)) {
    const error = 'Callsign already taken';
    setLobbyState(ctx, setErrorMessage(ctx.lobbyState, error));
    return { success: false, error };
  }

  // Save to localStorage
  setStoredCallsign(trimmed);

  // Broadcast and apply
  broadcastAndApply(
    ctx,
    createCallsignUpdateMessage(ctx.localPlayerId, trimmed),
  );

  return { success: true };
}

/**
 * Handle autoaim setting change in multiplayer lobby.
 * Broadcasts AutoaimUpdate and applies locally.
 */
export function handleAutoaimUpdate(
  ctx: LobbyContext,
  degrees: PlayerAutoaim,
): void {
  // Broadcast to all peers
  broadcastMessage(ctx, createAutoaimUpdateMessage(ctx.localPlayerId, degrees));

  // Apply locally
  const newState = setPlayerAutoaimDegrees(
    ctx.lobbyState,
    ctx.localPlayerId,
    degrees,
  );
  setLobbyState(ctx, newState);
}

// =============================================================================
// Re-exports
// =============================================================================

export { kickPlayer } from './lobby-kick';
export {
  abortLaunchCountdown,
  checkCanLaunch,
  handlePlayerUnready,
  isLaunchCountdownActive,
  type OnMissionStart,
  resetLaunch,
  startLaunchCountdown,
} from './lobby-launch-actions';
