/**
 * Mission Lifecycle Messages - Messages for mission start, end, and related events.
 */

import type { GameMessageType, MissionOutcomeData } from './types';

// =============================================================================
// Mission Lifecycle Messages
// =============================================================================

/**
 * ContractAccepted - Host → All
 * Contract selected for next mission.
 *
 * @mp-operation contractAccepted
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Host clicks Accept on contract → broadcasts ContractAccepted → starts countdown if all ready
 * @mp-ui Lobby: "Contract selected: {id}" system message
 * @mp-tested e2e/launch-countdown.mjs:testCountdownDisplaysInChat
 * @mp-status implemented
 */
export interface ContractAcceptedMessage {
  type: GameMessageType.ContractAccepted;
  contractId: string;
}

/**
 * LaunchCountdown - Host → All
 * Mission launch countdown tick.
 *
 * @mp-operation launchCountdown
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Host starts countdown → broadcasts tick each second → 0 triggers mission start
 * @mp-ui Lobby: "Launching in {n}..." system messages in chat
 * @mp-tested e2e/launch-countdown.mjs:testCountdownDisplaysInChat
 * @mp-status implemented
 */
export interface LaunchCountdownMessage {
  type: GameMessageType.LaunchCountdown;
  /** Seconds remaining (0 = launch) */
  secondsRemaining: number;
}

/**
 * LaunchAborted - Host → All
 * Mission launch cancelled.
 *
 * @mp-operation launchAborted
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Player becomes unready during countdown → host broadcasts LaunchAborted
 * @mp-ui Lobby: "Launch aborted: {reason}" system message
 * @mp-tested e2e/launch-countdown.mjs:testUnreadyAbortsCountdown
 * @mp-status implemented
 */
export interface LaunchAbortedMessage {
  type: GameMessageType.LaunchAborted;
  /** Reason for abort (e.g., "Player not ready", "Contract cancelled") */
  reason: string;
}

/**
 * MissionStarted - Host → All
 * Mission beginning with seed for determinism.
 *
 * @mp-operation missionStarted
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Countdown reaches 0 → host broadcasts MissionStarted with PRNG seed → all clients start mission
 * @mp-ui Lobby: "Mission starting..." system message; transition to mission screen
 * @mp-tested e2e/launch-countdown.mjs
 * @mp-status implemented
 */
export interface MissionStartedMessage {
  type: GameMessageType.MissionStarted;
  contractId: string;
  /** PRNG seed for deterministic simulation */
  seed: number;
  /** Hash of the campaign state at mission start, for guest verification */
  campaignStateHash: number;
}

/**
 * MissionEnded - Host → All
 * Mission complete with outcome.
 *
 * @mp-operation missionEnded
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Mission completes → host broadcasts MissionEnded with outcome → results screen shown
 * @mp-ui Results screen: victory/defeat, credits earned, kills, etc.
 * @mp-tested none
 * @mp-status implemented
 */
export interface MissionEndedMessage {
  type: GameMessageType.MissionEnded;
  outcome: MissionOutcomeData;
}

/**
 * SessionEnded - Host → All
 * Multiplayer session terminating.
 *
 * @mp-operation sessionEnded
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Host leaves or campaign ends → broadcasts SessionEnded → guests return to main menu
 * @mp-ui Guests: "Session ended: {reason}" notification; return to title screen
 * @mp-tested none
 * @mp-status implemented
 */
export interface SessionEndedMessage {
  type: GameMessageType.SessionEnded;
  /** Reason for ending (e.g., "Host left", "Campaign over") */
  reason: string;
}

/**
 * KickNotification - Host → Kicked
 * Notify player they are being kicked.
 *
 * @mp-operation kick
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Host clicks Kick on player → sends KickNotification → broadcasts PlayerLeftExt (kicked)
 * @mp-ui Host: Kick button in player popover; Kicked player: "You were kicked" notification
 * @mp-tested none
 * @mp-status implemented
 */
export interface KickNotificationMessage {
  type: GameMessageType.KickNotification;
  /** Optional reason for kick */
  reason?: string;
}

/**
 * ReturnToLobby - Host → All
 * Host triggers return to lobby for all players after debrief.
 *
 * @mp-operation returnToLobby
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Host clicks Continue on results → broadcasts ReturnToLobby → all navigate to lobby
 * @mp-ui Results screen: Host Continue button triggers; guests navigate automatically
 * @mp-tested e2e/debrief-flow.mjs:testHostContinueReturnsToLobby
 * @mp-status implemented
 */
export interface ReturnToLobbyMessage {
  type: GameMessageType.ReturnToLobby;
}
