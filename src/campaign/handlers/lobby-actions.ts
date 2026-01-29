/**
 * Lobby Actions - Functions that modify lobby state.
 *
 * All actions take LobbyContext as the first argument.
 * Actions may have side effects (UI updates, network sync).
 */

import {
  abortCountdown,
  canLaunch,
  isCountdownInProgress,
  resetLaunchState,
  shouldAbortOnUnready,
  startCountdown,
} from '../../multiplayer/launch-flow';
import {
  createChatMessage,
  createPermissionUpdateMessage,
  createReadyStateMessage,
  lobbyPlayerToGamePlayer,
  processLobbyMessage,
} from '../../multiplayer/lobby-messages';
import {
  addSystemMessage,
  type LobbyState,
} from '../../multiplayer/lobby-state';
import { createMissionStartData } from '../../multiplayer/mission-sync';
import {
  getMultiplayerContext,
  setMultiplayerContext,
} from '../../multiplayer/multiplayer-context';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import type {
  LaunchAbortedMessage,
  LaunchCountdownMessage,
  MissionStartedMessage,
} from '../../multiplayer/protocol/messages';
import type { Permission } from '../../multiplayer/protocol/types';
import { GameMessageType } from '../../multiplayer/protocol/types';
import {
  isContractsUIActive,
  refreshContractsUI,
} from '../../ui/screens/contracts';
import {
  updateLobbyCampaignInfo,
  updateLobbyState,
} from '../../ui/screens/lobby';
import {
  isSquadronUIActive,
  refreshSquadronUI,
} from '../../ui/screens/squadron';
import { isStoreUIActive, refreshStoreUI } from '../../ui/screens/store/store';
import type { CampaignState } from '../types';
import { getLobbyContext, type LobbyContext } from './lobby-context';

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
 */
export function syncCampaignState(
  ctx: LobbyContext,
  newState: CampaignState,
): void {
  if (ctx.isHost) {
    ctx.syncManager.setCampaignState(newState);
    ctx.syncManager.syncCampaign();
  }
}

/**
 * Sync campaign state to all guests (host only).
 * Wrapper that gets context and calls the action.
 */
export function updateAndSyncCampaignState(newState: CampaignState): void {
  const ctx = getLobbyContext();
  if (ctx) {
    syncCampaignState(ctx, newState);
  }
}

// =============================================================================
// User Actions
// =============================================================================

/**
 * Broadcast a lobby message and optimistically apply it locally.
 * Common pattern for toggleReady, sendChat, and changePermissions.
 */
function broadcastAndApply(
  ctx: LobbyContext,
  message: Parameters<typeof encodeMessage>[0],
): void {
  broadcastMessage(ctx, message);
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
 * Handle ready button toggle.
 */
export function toggleReady(ctx: LobbyContext, ready: boolean): void {
  broadcastAndApply(ctx, createReadyStateMessage(ctx.localPlayerId, ready));
}

/**
 * Handle chat message send.
 */
export function sendChat(ctx: LobbyContext, text: string): void {
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

// =============================================================================
// Launch Countdown (Host Only)
// =============================================================================

/** Callback when mission should start */
export type OnMissionStart = (contractId: string, seed: number) => void;

/**
 * Check if all players are ready and launch is possible.
 */
export function checkCanLaunch(ctx: LobbyContext): {
  canLaunch: boolean;
  reason?: string;
} {
  return canLaunch(ctx.lobbyState.players);
}

/**
 * Start the launch countdown (host only).
 * Returns false if countdown cannot be started.
 */
export function startLaunchCountdown(
  ctx: LobbyContext,
  contractId: string,
  onMissionStart: OnMissionStart,
): boolean {
  if (!ctx.isHost) return false;
  if (!ctx.screenManager.campaignState) return false;

  // Check if all players are ready
  const launchCheck = canLaunch(ctx.lobbyState.players);
  if (!launchCheck.canLaunch) {
    const newState = addSystemMessage(
      ctx.lobbyState,
      launchCheck.reason ?? 'Cannot launch',
    );
    setLobbyState(ctx, newState);
    return false;
  }

  // Start the countdown
  const started = startCountdown(contractId, {
    onTick: (seconds) => {
      // Broadcast countdown to all players
      const message: LaunchCountdownMessage = {
        type: GameMessageType.LaunchCountdown,
        secondsRemaining: seconds,
      };
      broadcastMessage(ctx, message);

      // Add to local chat
      const newState = addSystemMessage(
        ctx.lobbyState,
        `Launching in ${seconds}...`,
      );
      setLobbyState(ctx, newState);
    },
    onComplete: () => {
      // campaignState was verified at function start, but check again for safety
      if (!ctx.screenManager.campaignState) return;

      // Generate mission start data
      const missionData = createMissionStartData(
        contractId,
        ctx.screenManager.campaignState,
      );

      // Broadcast mission start with campaign state hash for verification
      const message: MissionStartedMessage = {
        type: GameMessageType.MissionStarted,
        contractId: missionData.contractId,
        seed: missionData.seed,
        campaignStateHash: missionData.campaignStateHash,
      };
      broadcastMessage(ctx, message);

      // Update room state to prevent mid-mission joins
      setRoomStatePlaying(ctx);

      // Call the mission start callback
      onMissionStart(missionData.contractId, missionData.seed);
    },
    onAbort: (reason) => {
      // Broadcast abort to all players
      const message: LaunchAbortedMessage = {
        type: GameMessageType.LaunchAborted,
        reason,
      };
      broadcastMessage(ctx, message);

      // Add to local chat
      const newState = addSystemMessage(
        ctx.lobbyState,
        `Launch aborted: ${reason}`,
      );
      setLobbyState(ctx, newState);
    },
  });

  return started;
}

/**
 * Abort the current launch countdown (host only).
 */
export function abortLaunchCountdown(ctx: LobbyContext, reason: string): void {
  if (!ctx.isHost) return;
  abortCountdown(reason);
}

/**
 * Handle player becoming unready during countdown.
 * If a countdown is in progress, this will abort it.
 */
export function handlePlayerUnready(ctx: LobbyContext, playerId: string): void {
  if (!ctx.isHost) return;

  const result = shouldAbortOnUnready(playerId, ctx.lobbyState.players);
  if (result.shouldAbort && result.reason) {
    abortCountdown(result.reason);
  }
}

/**
 * Check if a countdown is currently in progress.
 */
export function isLaunchCountdownActive(): boolean {
  return isCountdownInProgress();
}

/**
 * Reset launch state (call when leaving lobby).
 */
export function resetLaunch(): void {
  resetLaunchState();
}

// =============================================================================
// Network Utilities
// =============================================================================

/**
 * Set room state to 'playing' on the signaling server.
 * Prevents new players from joining mid-mission.
 */
function setRoomStatePlaying(ctx: LobbyContext): void {
  const signalingClient = ctx.connectionFlow.getSignalingClient();
  if (signalingClient) {
    signalingClient.setState('playing').catch((err) => {
      console.warn('[lobby-actions] Failed to set room state to playing:', err);
    });
  }
}

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
