/**
 * Campaign State Synchronization for Multiplayer.
 *
 * Handles:
 * - Host broadcasting campaign state to all guests
 * - Guest applying received campaign state
 * - Host processing action requests from guests with permission validation
 *
 * Design pattern:
 * - Guests never modify campaign state directly
 * - All changes go through ActionRequest → Host validates → ActionResponse
 * - Host broadcasts CampaignSync after every change
 */

import { reconstituteCampaignState } from '../campaign/storage/campaign-utils';
import type { CampaignState } from '../campaign/types';
import {
  processAction,
  validateActionData,
  validateActionPermission,
} from './action-processing';
import type { MessageRouter } from './protocol';
import {
  type ActionRequestData,
  type ActionResponseMessage,
  type CampaignSyncMessage,
  GameMessageType,
  type GamePlayerInfo,
} from './protocol/messages';

// Re-export types from action-processing for convenience
export type { ActionResult } from './action-processing';
export {
  processAction,
  validateActionData,
  validateActionPermission,
} from './action-processing';

// =============================================================================
// Types
// =============================================================================

/** Callback when campaign state is updated (for UI refresh) */
export type CampaignUpdateCallback = (state: CampaignState) => void;

// =============================================================================
// CampaignSyncManager
// =============================================================================

/**
 * Manages campaign state synchronization between host and guests.
 */
export class CampaignSyncManager {
  private readonly router: MessageRouter;
  private readonly isHost: boolean;
  private campaignState: CampaignState | null = null;
  private players = new Map<string, GamePlayerInfo>();

  /**
   * Track whether Welcome has been processed (guest only).
   * Used to prevent CampaignSync messages from being processed before
   * the initial Welcome state is received, which could lead to
   * inconsistent state.
   */
  private welcomeReceived = false;

  /** Called when campaign state is updated (for UI refresh) */
  onCampaignUpdate: CampaignUpdateCallback | null = null;

  constructor(router: MessageRouter, isHost: boolean) {
    this.router = router;
    this.isHost = isHost;

    // Set up message handlers
    if (isHost) {
      this.router.onActionRequest(this.handleActionRequest.bind(this));
    } else {
      this.router.onCampaignSync(this.handleCampaignSync.bind(this));
      // Note: Welcome handler is registered in wireMessageHandlers
      // (lobby-protocol-routing.ts) which combines lobby state + campaign
      // state processing, since the router only supports one handler per type.
    }
  }

  // ===========================================================================
  // Host Methods
  // ===========================================================================

  /**
   * Host: Set the current campaign state.
   * Call this when loading a campaign or after local changes.
   *
   * Guest: Also called from Welcome handler to set initial state.
   * When called for guest, also marks Welcome as received.
   */
  setCampaignState(state: CampaignState): void {
    this.campaignState = state;
    // For guests, setting campaign state from Welcome marks it as received
    if (!this.isHost) {
      this.welcomeReceived = true;
    }
  }

  /**
   * Host: Broadcast current campaign state to all guests.
   * Call after any state change (action processed, mission end, etc.)
   */
  syncCampaign(): void {
    if (!this.isHost || !this.campaignState) return;

    const msg: CampaignSyncMessage = {
      type: GameMessageType.CampaignSync,
      campaignState: this.campaignState,
    };
    this.router.broadcast(msg);
  }

  /**
   * Host: Update player info.
   */
  setPlayerInfo(playerId: string, info: GamePlayerInfo): void {
    this.players.set(playerId, info);
  }

  /**
   * Host: Remove player info.
   */
  removePlayerInfo(playerId: string): void {
    this.players.delete(playerId);
  }

  /**
   * Get the players map (for permission validation).
   */
  getPlayers(): Map<string, GamePlayerInfo> {
    return this.players;
  }

  /**
   * Host: Handle an action request from a guest.
   * Validates permissions, applies action, sends response, and syncs state.
   */
  private handleActionRequest(
    msg: { requestId: number; action: ActionRequestData },
    fromPeerId: string,
  ): void {
    if (!this.isHost || !this.campaignState) return;

    const playerInfo = this.players.get(fromPeerId);
    if (!playerInfo) {
      this.sendActionResponse(
        fromPeerId,
        msg.requestId,
        false,
        'Unknown player',
      );
      return;
    }

    // Validate permissions
    const permissionError = validateActionPermission(
      msg.action,
      fromPeerId,
      playerInfo.permissions,
      this.players,
      this.router.getHostPeerId(),
    );
    if (permissionError) {
      this.sendActionResponse(
        fromPeerId,
        msg.requestId,
        false,
        permissionError,
      );
      return;
    }

    // Validate action data shape
    const dataError = validateActionData(msg.action);
    if (dataError) {
      this.sendActionResponse(fromPeerId, msg.requestId, false, dataError);
      return;
    }

    // Process action
    const result = processAction(msg.action, this.campaignState);
    this.sendActionResponse(
      fromPeerId,
      msg.requestId,
      result.success,
      result.error,
    );

    // If successful, update state and sync
    if (result.success && result.newState) {
      this.campaignState = result.newState;
      this.onCampaignUpdate?.(result.newState);
      this.syncCampaign();
    }
  }

  private sendActionResponse(
    peerId: string,
    requestId: number,
    success: boolean,
    error?: string,
  ): void {
    const response: ActionResponseMessage = error
      ? { type: GameMessageType.ActionResponse, requestId, success, error }
      : { type: GameMessageType.ActionResponse, requestId, success };
    this.router.sendToPeer(peerId, response);
  }

  // ===========================================================================
  // Guest Methods
  // ===========================================================================

  /**
   * Guest: Get the current campaign state.
   */
  getCampaignState(): CampaignState | null {
    return this.campaignState;
  }

  /**
   * Guest: Handle campaign sync message from host.
   * Ignores messages received before Welcome to prevent race conditions.
   */
  private handleCampaignSync(msg: CampaignSyncMessage): void {
    // Ignore CampaignSync if Welcome hasn't been received yet.
    // The Welcome message provides the authoritative initial state.
    if (!this.welcomeReceived) {
      console.warn(
        '[CampaignSyncManager] Ignoring CampaignSync received before Welcome',
      );
      return;
    }

    const state = reconstituteCampaignState(msg.campaignState);
    this.campaignState = state;
    this.onCampaignUpdate?.(state);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.onCampaignUpdate = null;
    this.campaignState = null;
    this.players.clear();
    this.welcomeReceived = false;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new campaign sync manager.
 */
export function createCampaignSyncManager(
  router: MessageRouter,
  isHost: boolean,
): CampaignSyncManager {
  return new CampaignSyncManager(router, isHost);
}
