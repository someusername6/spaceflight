/**
 * Launch Flow - Manages the mission launch countdown for multiplayer.
 *
 * Handles:
 * - Ready state validation (all players must be ready)
 * - 10-second countdown with broadcast messages
 * - Abort on player becoming unready
 * - Mission start synchronization
 */

import type { LobbyPlayer } from './lobby-state';

// =============================================================================
// Types
// =============================================================================

/** Launch flow state */
export interface LaunchFlowState {
  /** Whether a countdown is currently in progress */
  isCountingDown: boolean;
  /** Current countdown seconds (10 down to 0) */
  countdownSeconds: number;
  /** Selected contract ID for launch */
  contractId: string | null;
  /** Reason if countdown was aborted */
  abortReason: string | null;
}

/** Result of canLaunch check */
export interface CanLaunchResult {
  canLaunch: boolean;
  reason?: string;
}

/** Callbacks for countdown events */
export interface CountdownCallbacks {
  /** Called each second with remaining time */
  onTick: (seconds: number) => void;
  /** Called when countdown completes (0 reached) */
  onComplete: () => void;
  /** Called if countdown is aborted */
  onAbort: (reason: string) => void;
}

// =============================================================================
// State
// =============================================================================

/** Module-level launch state */
let launchState: LaunchFlowState = {
  isCountingDown: false,
  countdownSeconds: 0,
  contractId: null,
  abortReason: null,
};

/** Active countdown interval */
let countdownInterval: ReturnType<typeof setInterval> | null = null;

/** Active callbacks */
let activeCallbacks: CountdownCallbacks | null = null;

// =============================================================================
// State Access
// =============================================================================

/** Check if countdown is in progress */
export function isCountdownInProgress(): boolean {
  return launchState.isCountingDown;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Check if mission can be launched.
 * All players must be ready.
 */
export function canLaunch(players: LobbyPlayer[]): CanLaunchResult {
  // Check if all players are ready
  const notReadyPlayers = players.filter((p) => !p.isReady);

  if (notReadyPlayers.length > 0) {
    const first = notReadyPlayers[0];
    if (notReadyPlayers.length === 1 && first) {
      return {
        canLaunch: false,
        reason: `Waiting for ${first.callsign} to ready`,
      };
    }
    return {
      canLaunch: false,
      reason: `Waiting for ${notReadyPlayers.length} players to ready`,
    };
  }

  return { canLaunch: true };
}

/**
 * Check if a specific player becoming unready should abort the countdown.
 */
export function shouldAbortOnUnready(
  playerId: string,
  players: LobbyPlayer[],
): { shouldAbort: boolean; reason?: string } {
  if (!launchState.isCountingDown) {
    return { shouldAbort: false };
  }

  const player = players.find((p) => p.playerId === playerId);
  if (!player) {
    return { shouldAbort: false };
  }

  return {
    shouldAbort: true,
    reason: `${player.callsign} is not ready`,
  };
}

// =============================================================================
// Countdown Control
// =============================================================================

/** Countdown duration in seconds (can be shortened via window.__TEST_COUNTDOWN_SECONDS__) */
function getCountdownSeconds(): number {
  if (
    typeof window !== 'undefined' &&
    window.__TEST_COUNTDOWN_SECONDS__ !== undefined
  ) {
    return window.__TEST_COUNTDOWN_SECONDS__;
  }
  return 10;
}

/**
 * Start the launch countdown.
 * Host only - broadcasts countdown messages.
 */
export function startCountdown(
  contractId: string,
  callbacks: CountdownCallbacks,
): boolean {
  // Don't start if already counting down
  if (launchState.isCountingDown) {
    return false;
  }

  const countdownSeconds = getCountdownSeconds();

  // Initialize state
  launchState = {
    isCountingDown: true,
    countdownSeconds,
    contractId,
    abortReason: null,
  };
  activeCallbacks = callbacks;

  // Emit initial tick
  callbacks.onTick(countdownSeconds);

  // Start interval
  countdownInterval = setInterval(() => {
    launchState.countdownSeconds--;

    if (launchState.countdownSeconds <= 0) {
      // Countdown complete
      clearCountdownInterval();
      launchState.isCountingDown = false;
      callbacks.onComplete();
    } else {
      // Emit tick
      callbacks.onTick(launchState.countdownSeconds);
    }
  }, 1000);

  return true;
}

/**
 * Abort the current countdown.
 */
export function abortCountdown(reason: string): void {
  if (!launchState.isCountingDown) {
    return;
  }

  clearCountdownInterval();

  launchState.isCountingDown = false;
  launchState.abortReason = reason;

  if (activeCallbacks) {
    activeCallbacks.onAbort(reason);
    activeCallbacks = null;
  }
}

/**
 * Reset launch state (call when leaving lobby or after mission).
 */
export function resetLaunchState(): void {
  clearCountdownInterval();
  launchState = {
    isCountingDown: false,
    countdownSeconds: 0,
    contractId: null,
    abortReason: null,
  };
  activeCallbacks = null;
}

/** Clear the countdown interval */
function clearCountdownInterval(): void {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

// =============================================================================
// Guest Countdown Handling
// =============================================================================

/**
 * Handle countdown tick received from host (guest only).
 * Updates local state to match host's countdown.
 */
export function handleCountdownTick(
  seconds: number,
  contractId: string | null,
): void {
  launchState.isCountingDown = seconds > 0;
  launchState.countdownSeconds = seconds;
  launchState.contractId = contractId;
  launchState.abortReason = null;
}

/**
 * Handle countdown abort received from host (guest only).
 */
export function handleCountdownAbort(reason: string): void {
  launchState.isCountingDown = false;
  launchState.countdownSeconds = 0;
  launchState.abortReason = reason;
}
