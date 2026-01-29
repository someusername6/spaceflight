/**
 * Lobby Launch Actions - Launch countdown and mission start functions.
 *
 * Host-only actions for managing mission launch flow.
 */

import {
  abortCountdown,
  canLaunch,
  isCountdownInProgress,
  resetLaunchState,
  shouldAbortOnUnready,
  startCountdown,
} from '../../multiplayer/launch-flow';
import { addSystemMessage } from '../../multiplayer/lobby-state';
import { createMissionStartData } from '../../multiplayer/mission-sync';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import type {
  LaunchAbortedMessage,
  LaunchCountdownMessage,
  MissionStartedMessage,
} from '../../multiplayer/protocol/messages';
import { GameMessageType } from '../../multiplayer/protocol/types';
import { setLobbyState } from './lobby-actions';
import type { LobbyContext } from './lobby-context';

// =============================================================================
// Types
// =============================================================================

/** Callback when mission should start */
export type OnMissionStart = (contractId: string, seed: number) => void;

// =============================================================================
// Launch Countdown (Host Only)
// =============================================================================

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
