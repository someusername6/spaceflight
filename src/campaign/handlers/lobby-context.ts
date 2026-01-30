/**
 * Lobby Context - Central context object for lobby state and dependencies.
 *
 * Instead of scattered module-level state accessed via getters,
 * all lobby state lives in a single context object that is:
 * - Created at lobby setup
 * - Passed explicitly to all functions that need it
 * - Stored in one module-level variable for external access
 */

import type { CampaignSyncManager } from '../../multiplayer/campaign-sync';
import type { LobbyState } from '../../multiplayer/lobby-state';
import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import type { MessageRouter } from '../../multiplayer/protocol/router';
import type { ScreenManager } from '../../ui/common/screens';
import type { CampaignState, Contract } from '../types';

// =============================================================================
// Callback Types
// =============================================================================

/**
 * Callback invoked when mission should start (for guests receiving MissionStarted).
 * @param contract - The contract being launched
 * @param seed - The PRNG seed for deterministic simulation
 */
export type OnMissionStartCallback = (contract: Contract, seed: number) => void;

// =============================================================================
// Context Type
// =============================================================================

/**
 * Lobby context containing all state and dependencies.
 * Created once at lobby setup, passed to all lobby functions.
 */
export interface LobbyContext {
  /** WebRTC connection flow */
  readonly connectionFlow: ConnectionFlow;

  /** Protocol message router */
  readonly router: MessageRouter;

  /** Campaign state synchronization manager */
  readonly syncManager: CampaignSyncManager;

  /** Whether this client is the host */
  readonly isHost: boolean;

  /** Local player's peer ID */
  readonly localPlayerId: string;

  /** Mutable lobby state (players, chat, ready states) */
  lobbyState: LobbyState;

  /** Screen manager — single source of truth for campaign state */
  readonly screenManager: ScreenManager;

  /** Cleanup function for message handling */
  readonly cleanup: () => void;

  /**
   * Callback for guest mission launch.
   * Set by the campaign controller, invoked when MissionStarted is received.
   * Only used by guests - host launches mission via countdown callback.
   */
  onMissionStart?: OnMissionStartCallback;
}

// =============================================================================
// Context Storage (single module-level variable)
// =============================================================================

/** Active lobby context - the only module-level state we need */
let activeContext: LobbyContext | null = null;

/**
 * Get the active lobby context.
 * Returns null if not in a lobby.
 */
export function getLobbyContext(): LobbyContext | null {
  return activeContext;
}

/**
 * Set the active lobby context.
 * Called during lobby setup.
 */
export function setLobbyContext(ctx: LobbyContext | null): void {
  activeContext = ctx;
}

/**
 * Check if currently in a lobby.
 */
export function isInLobby(): boolean {
  return activeContext !== null;
}

// =============================================================================
// Convenience Getters (for external code that just needs to read state)
// =============================================================================
//
// WARNING: These getters exist for external code that cannot easily receive
// LobbyContext (e.g., UI callbacks, external modules). For code within the
// lobby handlers, prefer passing LobbyContext explicitly to maintain clear
// dependencies and testability.

/**
 * Get the current campaign state from the lobby context.
 * Reads from screenManager (single source of truth).
 */
export function getLobbyCampaignState(): CampaignState | null {
  return activeContext?.screenManager.campaignState ?? null;
}

/**
 * Get the current lobby state.
 * Convenience function for code that only needs to read lobby state.
 */
export function getLobbyState(): LobbyState | null {
  return activeContext?.lobbyState ?? null;
}

/**
 * Get the campaign sync manager.
 * Used by external code (e.g., store) to sync state changes.
 */
export function getCampaignSyncManager(): CampaignSyncManager | null {
  return activeContext?.syncManager ?? null;
}

/**
 * Get the message router.
 * Used for sending protocol messages.
 */
export function getMessageRouter(): MessageRouter | null {
  return activeContext?.router ?? null;
}
