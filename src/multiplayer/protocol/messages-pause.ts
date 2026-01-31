/**
 * Pause-related protocol messages.
 *
 * Extracted from messages.ts for file size management.
 */

import type { GameMessageType } from './types';

// =============================================================================
// Pause Message Interfaces
// =============================================================================

/**
 * PauseReadyState - Any → All
 * Player ready/unready to resume during pause.
 *
 * @mp-operation pauseReadyState
 * @mp-actor host | guest
 * @mp-permission none
 * @mp-flow Player clicks Ready to Resume → broadcast to all → ready state updates
 * @mp-ui Pause modal: Ready indicator updates; countdown starts when all ready
 * @mp-tested e2e/mission-pause.mjs:testReadyToResumeCountdown
 * @mp-status implemented
 */
export interface PauseReadyStateMessage {
  type: GameMessageType.PauseReadyState;
  playerId: string;
  ready: boolean;
}

/**
 * PlayerDropped - Host → All
 * Player was dropped (by host) and their ship is now AI-controlled.
 *
 * @mp-operation playerDropped
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Host clicks Drop on disconnected player → converts ship to AI → broadcasts
 * @mp-ui Pause modal: Player row updates to show AI skill; mission continues with AI
 * @mp-tested e2e/mission-pause.mjs (manual verification)
 * @mp-status implemented
 */
export interface PlayerDroppedMessage {
  type: GameMessageType.PlayerDropped;
  playerId: string;
  /** AI skill level for the dropped player's ship */
  aiSkill: number;
}

/**
 * GuestQuitRequest - Guest → Host
 * Guest requests to leave the mission (voluntary quit).
 *
 * @mp-operation guestQuitRequest
 * @mp-actor guest
 * @mp-permission none
 * @mp-flow Guest clicks Quit → confirms → sends request → host converts ship to AI
 * @mp-ui Guest returns to title; host sees player as AI in pause modal
 * @mp-tested e2e/mission-pause.mjs:testGuestQuitReturnsToTitle
 * @mp-status implemented
 */
export interface GuestQuitRequestMessage {
  type: GameMessageType.GuestQuitRequest;
  playerId: string;
}

/**
 * Request to pause the mission (any player can initiate).
 *
 * @mp-operation pauseRequest
 * @mp-actor host | guest
 * @mp-permission none (any player can pause)
 * @mp-flow Player presses Escape → broadcasts PauseRequest → all show pause modal
 * @mp-ui Multiplayer pause modal appears for all players
 * @mp-tested e2e/mission-pause.mjs:testHostCanPauseMission
 * @mp-status implemented
 */
export interface PauseRequestMessage {
  type: GameMessageType.PauseRequest;
  playerId: string;
  callsign: string;
  reason: 'player-request' | 'player-disconnect' | 'lag-detected';
}
