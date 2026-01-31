/**
 * Session Lifecycle - Mission end and session management for multiplayer.
 *
 * Handles:
 * - Broadcasting MissionEnded to guests
 * - Broadcasting SessionEnded on host quit or campaign end
 * - Return-to-lobby flow after mission debrief
 * - Resetting lobby state after mission
 */

import { setLobbyState } from '../campaign/handlers/lobby-actions';
import type { LobbyContext } from '../campaign/handlers/lobby-context';
import { encodeMessage } from './protocol/encode';
import type {
  MissionEndedMessage,
  ReturnToLobbyMessage,
  SessionEndedMessage,
} from './protocol/messages';
import { GameMessageType, type MissionOutcomeData } from './protocol/types';

// =============================================================================
// Message Broadcasting
// =============================================================================

/**
 * Broadcast MissionEnded message to all guests.
 * Called by host when mission completes.
 */
export function broadcastMissionEnded(
  ctx: LobbyContext,
  outcome: MissionOutcomeData,
): void {
  if (!ctx.isHost) return;

  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  const msg: MissionEndedMessage = {
    type: GameMessageType.MissionEnded,
    outcome,
  };

  transport.broadcast(encodeMessage(msg), true);
}

/**
 * Broadcast SessionEnded message to all guests.
 * Called when host leaves or campaign ends (ironman death).
 */
export function broadcastSessionEnded(ctx: LobbyContext, reason: string): void {
  if (!ctx.isHost) return;

  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  const msg: SessionEndedMessage = {
    type: GameMessageType.SessionEnded,
    reason,
  };

  transport.broadcast(encodeMessage(msg), true);
}

// =============================================================================
// Lobby State Management
// =============================================================================

/**
 * Clear chat messages from lobby state.
 * Used when transitioning between debrief and lobby.
 */
export function clearLobbyChat(ctx: LobbyContext): void {
  const newState = {
    ...ctx.lobbyState,
    chatMessages: [],
  };
  setLobbyState(ctx, newState);
}

/**
 * Reset all players to unready state.
 * Called when returning to lobby after mission.
 */
export function resetAllPlayersReady(ctx: LobbyContext): void {
  const newState = {
    ...ctx.lobbyState,
    players: ctx.lobbyState.players.map((p) => ({
      ...p,
      isReady: false,
    })),
  };
  setLobbyState(ctx, newState);
}

/**
 * Reset lobby state after mission completion.
 * - Clears chat messages
 * - Resets all players to unready
 */
export function resetLobbyStateAfterMission(ctx: LobbyContext): void {
  const newState = {
    ...ctx.lobbyState,
    chatMessages: [],
    players: ctx.lobbyState.players.map((p) => ({
      ...p,
      isReady: false,
    })),
  };
  setLobbyState(ctx, newState);
}

// =============================================================================
// Debrief State Management
// =============================================================================

/**
 * Set debrief state to show mission is complete with outcome.
 */
export function setDebriefState(
  ctx: LobbyContext,
  outcome: MissionOutcomeData | null,
): void {
  ctx.debriefState = {
    missionComplete: true,
    outcome,
  };
}

/**
 * Clear debrief state when returning to lobby.
 */
export function clearDebriefState(ctx: LobbyContext): void {
  // Delete the property rather than setting to undefined
  // to satisfy exactOptionalPropertyTypes
  delete ctx.debriefState;
}

// =============================================================================
// Return to Lobby Flow
// =============================================================================

/**
 * Broadcast ReturnToLobby message to all guests.
 * Called by host when clicking Continue on results screen.
 */
export function broadcastReturnToLobby(ctx: LobbyContext): void {
  if (!ctx.isHost) return;

  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  const msg: ReturnToLobbyMessage = {
    type: GameMessageType.ReturnToLobby,
  };

  transport.broadcast(encodeMessage(msg), true);
}

/**
 * Set room state back to 'lobby' on the signaling server.
 * Allows new players to join after returning from debrief.
 */
function setRoomStateLobby(ctx: LobbyContext): void {
  if (!ctx.isHost) return;

  const signalingClient = ctx.connectionFlow.getSignalingClient();
  if (signalingClient) {
    signalingClient.setState('lobby').catch((err) => {
      console.warn(
        '[session-lifecycle] Failed to set room state to lobby:',
        err,
      );
    });
  }
}

/**
 * Trigger return to lobby for all players.
 * Called by host when clicking Continue on results screen.
 *
 * Host flow:
 * 1. Broadcast ReturnToLobby to all guests
 * 2. Set room state back to 'lobby' (allows new joins)
 * 3. Reset all players to unready
 * 4. Clear debrief state and chat
 * 5. Call onReturnToLobby callback (navigates to lobby)
 *
 * Guests receive ReturnToLobby message and trigger their own navigation.
 */
export function triggerReturnToLobby(ctx: LobbyContext): void {
  // Host broadcasts to guests first
  if (ctx.isHost) {
    broadcastReturnToLobby(ctx);
    // Reset room state to allow new joins
    setRoomStateLobby(ctx);
  }

  // Reset lobby state
  resetLobbyStateAfterMission(ctx);

  // Clear debrief state
  clearDebriefState(ctx);

  // Trigger navigation callback
  if (ctx.onReturnToLobby) {
    ctx.onReturnToLobby();
  }
}
