/**
 * Lobby Guest Handlers - Message handlers for guest-only protocol messages.
 *
 * These handlers are only wired for guest players (not host).
 * Extracted from lobby-protocol-routing.ts to keep file under 400 lines.
 */

import { logDebug } from '../../core/logger';
import {
  handleCountdownAbort,
  handleCountdownTick,
} from '../../multiplayer/launch-flow';
import { addSystemMessage } from '../../multiplayer/lobby-state';
import {
  findContractById,
  hashCampaignState,
} from '../../multiplayer/mission-sync';
import {
  CONTRACTS_PER_SCREEN,
  generateContracts,
} from '../../ui/screens/contracts-data';
import { setLobbyState } from './lobby-actions';
import type { LobbyContext } from './lobby-context';

/**
 * Wire guest-only message handlers.
 * Called by wireMessageHandlers when ctx.isHost is false.
 */
export function wireGuestHandlers(ctx: LobbyContext, hostPeerId: string): void {
  // Launch countdown handlers
  ctx.router.onLaunchCountdown((msg) => {
    handleCountdownTick(msg.secondsRemaining, null);
    // Display countdown in chat
    if (msg.secondsRemaining > 0) {
      const newState = addSystemMessage(
        ctx.lobbyState,
        `Launching in ${msg.secondsRemaining}...`,
      );
      setLobbyState(ctx, newState);
    }
  });

  ctx.router.onLaunchAborted((msg) => {
    handleCountdownAbort(msg.reason);
    const newState = addSystemMessage(
      ctx.lobbyState,
      `Launch aborted: ${msg.reason}`,
    );
    setLobbyState(ctx, newState);
  });

  ctx.router.onContractAccepted((msg) => {
    const newState = addSystemMessage(
      ctx.lobbyState,
      `Contract selected: ${msg.contractId}`,
    );
    setLobbyState(ctx, newState);
  });

  ctx.router.onMissionStarted((msg) => {
    const campaignState = ctx.screenManager.campaignState;
    if (!campaignState) {
      console.error('[lobby-routing] No campaign state at mission start');
      return;
    }

    // Verify campaign state hash matches local state
    const localHash = hashCampaignState(campaignState);
    if (msg.campaignStateHash !== localHash) {
      console.warn(
        `[lobby-routing] Campaign state hash mismatch at mission start: host=${msg.campaignStateHash}, local=${localHash}`,
      );
      const warnState = addSystemMessage(
        ctx.lobbyState,
        'Warning: Campaign state may be out of sync with host',
      );
      setLobbyState(ctx, warnState);
    }

    // Add system message
    const newState = addSystemMessage(ctx.lobbyState, 'Mission starting...');
    setLobbyState(ctx, newState);

    // Find the contract and launch the mission
    if (ctx.onMissionStart) {
      // Generate contracts deterministically (same as host)
      const { contracts } = generateContracts(
        campaignState.currentSector,
        campaignState.seed,
        campaignState.sectorMissionsCompleted,
        CONTRACTS_PER_SCREEN,
        campaignState.completedContracts,
        campaignState.contractRefreshCount,
      );

      const lookup = findContractById(msg.contractId, contracts);
      if (lookup.found && lookup.contract) {
        ctx.onMissionStart(lookup.contract, msg.seed);
      } else {
        console.error(
          `[lobby-routing] CONTRACT MISMATCH - Host requested: "${msg.contractId}" but guest generated: [${contracts.map((c) => c.id).join(', ')}]. ` +
            `Guest state: seed=${campaignState.seed}, sector=${campaignState.currentSector}, ` +
            `missionsCompleted=${campaignState.sectorMissionsCompleted}, completedContracts=${campaignState.completedContracts.length}, ` +
            `refreshCount=${campaignState.contractRefreshCount}`,
        );
      }
    }
  });

  // MissionEnded handler: store outcome for results display
  ctx.router.onMissionEnded((msg) => {
    logDebug(
      '[MissionEnded] Guest received message, victory:',
      msg.outcome.victory,
    );
    // Store the outcome in debrief state
    ctx.debriefState = {
      missionComplete: true,
      outcome: msg.outcome,
    };

    const newState = addSystemMessage(
      ctx.lobbyState,
      msg.outcome.victory ? 'Mission complete!' : 'Mission failed.',
    );
    setLobbyState(ctx, newState);
  });

  // SessionEnded handler: cleanup and return to title
  ctx.router.onSessionEnded((msg) => {
    logDebug('[lobby-routing] Guest received SessionEnded:', msg.reason);

    // Invoke callback to cleanup and navigate to title
    if (ctx.onSessionEnded) {
      ctx.onSessionEnded(msg.reason);
    }
  });

  // KickNotification handler: guest was kicked by host
  ctx.router.onKickNotification((msg) => {
    logDebug('[lobby-routing] Guest received KickNotification:', msg.reason);

    // Invoke callback to cleanup and navigate to title with kick message
    if (ctx.onSessionEnded) {
      ctx.onSessionEnded(msg.reason ?? 'You have been kicked');
    }
  });

  // Host disconnect handler: treat as session end if SessionEnded never arrived.
  // The host broadcasts SessionEnded before disconnecting, but the message may
  // not arrive if the WebRTC data channel is torn down before it flushes.
  ctx.router.onPeerDisconnect = (peerId) => {
    if (peerId === hostPeerId) {
      logDebug('[lobby-routing] Host disconnected, treating as session end');
      if (ctx.onSessionEnded) {
        ctx.onSessionEnded('Host left the session');
      }
    }
  };

  // ReturnToLobby handler: navigate back to lobby when host continues
  ctx.router.onReturnToLobby(() => {
    logDebug('[lobby-routing] Guest received ReturnToLobby');
    // Reset lobby state
    const newState = {
      ...ctx.lobbyState,
      chatMessages: [],
      players: ctx.lobbyState.players.map((p) => ({
        ...p,
        isReady: false,
      })),
    };
    setLobbyState(ctx, newState);

    // Clear debrief state
    delete ctx.debriefState;

    // Trigger navigation callback
    if (ctx.onReturnToLobby) {
      ctx.onReturnToLobby();
    }
  });
}
