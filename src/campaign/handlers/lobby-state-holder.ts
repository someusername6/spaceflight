/**
 * Lobby State Holder - Module-level state for lobby handlers.
 *
 * Pure state storage with simple getters/setters.
 * For functions with side effects (UI refresh, sync), see lobby-state-effects.ts.
 */

import type { CampaignSyncManager } from '../../multiplayer/campaign-sync';
import type { LobbyState } from '../../multiplayer/lobby-state';
import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import type { MessageRouter } from '../../multiplayer/protocol/router';
import type { CampaignState } from '../types';
import type { MessageHandlingResult } from './lobby-protocol-routing';

// =============================================================================
// Module State
// =============================================================================

/** Active connection flow */
let activeConnectionFlow: ConnectionFlow | null = null;

/** Current lobby state */
let lobbyState: LobbyState | null = null;

/** Current campaign state (for sending to guests) */
let activeCampaignState: CampaignState | null = null;

/** Message handling result (cleanup, router, syncManager) */
let messageHandlingResult: MessageHandlingResult | null = null;

/** Message router for protocol messages */
let messageRouter: MessageRouter | null = null;

/** Campaign sync manager */
let campaignSyncManager: CampaignSyncManager | null = null;

// =============================================================================
// State Getters
// =============================================================================

/** Get active connection flow */
export function getActiveConnectionFlow(): ConnectionFlow | null {
  return activeConnectionFlow;
}

/** Get current lobby state */
export function getLobbyState(): LobbyState | null {
  return lobbyState;
}

/** Get current campaign state */
export function getActiveCampaignState(): CampaignState | null {
  return activeCampaignState;
}

/** Get message router */
export function getMessageRouter(): MessageRouter | null {
  return messageRouter;
}

/** Get campaign sync manager */
export function getCampaignSyncManager(): CampaignSyncManager | null {
  return campaignSyncManager;
}

/** Check if in multiplayer lobby context */
export function isInLobby(): boolean {
  return lobbyState !== null;
}

/** Get message handling result (for cleanup) */
export function getMessageHandlingResult(): MessageHandlingResult | null {
  return messageHandlingResult;
}

// =============================================================================
// State Setters
// =============================================================================

/** Set active connection flow */
export function setActiveConnectionFlow(flow: ConnectionFlow | null): void {
  activeConnectionFlow = flow;
}

/** Set current campaign state (internal, no sync) */
export function setActiveCampaignStateInternal(
  state: CampaignState | null,
): void {
  activeCampaignState = state;
}

/** Set lobby state (internal, no UI update) */
export function setLobbyStateInternal(state: LobbyState | null): void {
  lobbyState = state;
}

/** Set message handling result */
export function setMessageHandlingResult(
  result: MessageHandlingResult | null,
): void {
  messageHandlingResult = result;
  messageRouter = result?.router ?? null;
  campaignSyncManager = result?.syncManager ?? null;
}

// =============================================================================
// Cleanup
// =============================================================================

/** Clear all module state */
export function clearModuleState(): void {
  messageHandlingResult = null;
  messageRouter = null;
  campaignSyncManager = null;
  activeConnectionFlow = null;
  lobbyState = null;
  activeCampaignState = null;
}
