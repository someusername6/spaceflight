/**
 * Action Client - Send campaign actions through multiplayer channel.
 *
 * For guests: sends ActionRequest to host, waits for ActionResponse.
 * For hosts: directly applies action and syncs to guests.
 *
 * This module provides a unified interface for campaign state changes
 * in multiplayer mode.
 */

import { updateAndSyncCampaignState } from '../campaign/handlers/lobby-actions';
import {
  getCampaignSyncManager,
  getMessageRouter,
  isInLobby,
} from '../campaign/handlers/lobby-context';
import type { CampaignState } from '../campaign/types';
import {
  type ActionResult,
  processAction,
  validateActionPermission,
} from './action-processing';
import { getMultiplayerContext } from './multiplayer-context';
import type { ActionRequestData } from './protocol/messages';
import { GameMessageType } from './protocol/types';

/** Pending action request waiting for response */
interface PendingRequest {
  resolve: (result: ActionResult) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// =============================================================================
// Module State
// =============================================================================

/** Next request ID for action requests */
let nextRequestId = 1;

/** Map of pending requests waiting for responses */
const pendingRequests = new Map<number, PendingRequest>();

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 5000;

// =============================================================================
// Response Handler Setup
// =============================================================================

/** Flag to track if response handler is set up */
let isResponseHandlerSetUp = false;

/**
 * Set up the ActionResponse handler on the message router.
 * Called automatically when needed.
 */
function ensureResponseHandlerSetUp(): void {
  if (isResponseHandlerSetUp) return;

  const router = getMessageRouter();
  if (!router) return;

  router.onActionResponse((msg) => {
    const pending = pendingRequests.get(msg.requestId);
    if (!pending) return;

    // Clear timeout
    clearTimeout(pending.timeout);
    pendingRequests.delete(msg.requestId);

    // Resolve with result
    const result: ActionResult = { success: msg.success };
    if (msg.error !== undefined) {
      result.error = msg.error;
    }
    pending.resolve(result);
  });

  isResponseHandlerSetUp = true;
}

// =============================================================================
// Action Client
// =============================================================================

/**
 * Check if we should use the ActionRequest flow.
 * Returns true if we're a guest in a multiplayer lobby.
 */
export function shouldUseActionRequest(): boolean {
  if (!isInLobby()) return false;
  const context = getMultiplayerContext();
  return context !== null && !context.isHost;
}

/**
 * Send an action request through the multiplayer channel.
 *
 * For guests: sends to host and waits for response.
 * For hosts: directly processes and syncs.
 *
 * @param action - The action to perform
 * @param currentState - Current campaign state (needed for host processing)
 * @returns Result of the action
 */
export async function sendAction(
  action: ActionRequestData,
  currentState: CampaignState,
): Promise<ActionResult> {
  const context = getMultiplayerContext();

  // Not in multiplayer - should not be called
  if (!context || !isInLobby()) {
    return { success: false, error: 'Not in multiplayer mode' };
  }

  // Host: validate permissions, then process directly and sync
  if (context.isHost) {
    const syncManager = getCampaignSyncManager();
    const players = syncManager?.getPlayers() ?? new Map();
    const permissionError = validateActionPermission(
      action,
      context.playerId,
      context.permissions,
      players,
    );
    if (permissionError) {
      return { success: false, error: permissionError };
    }

    const result = processAction(action, currentState);
    if (result.success && result.newState) {
      updateAndSyncCampaignState(result.newState);
      return { success: true, newState: result.newState };
    }
    return { success: false, error: result.error ?? 'Action failed' };
  }

  // Guest: send to host via ActionRequest
  const router = getMessageRouter();
  if (!router) {
    return { success: false, error: 'No connection to host' };
  }

  ensureResponseHandlerSetUp();

  const requestId = nextRequestId++;

  return new Promise<ActionResult>((resolve) => {
    // Set up timeout
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      resolve({ success: false, error: 'Request timed out' });
    }, REQUEST_TIMEOUT_MS);

    // Store pending request
    pendingRequests.set(requestId, { resolve, timeout });

    // Send request to host
    router.sendToHost({
      type: GameMessageType.ActionRequest,
      requestId,
      action,
    });
  });
}

/**
 * Clear all pending requests (call on disconnect).
 */
export function clearPendingRequests(): void {
  for (const [, pending] of pendingRequests) {
    clearTimeout(pending.timeout);
    pending.resolve({ success: false, error: 'Disconnected' });
  }
  pendingRequests.clear();
  isResponseHandlerSetUp = false;
}

// =============================================================================
// Helper Functions for Common Actions
// =============================================================================

/**
 * Request a buy action.
 */
export function requestBuyAction(
  currentState: CampaignState,
  itemType: 'ship' | 'primary' | 'secondary' | 'ammo',
  itemId: string,
  quantity = 1,
): Promise<ActionResult> {
  return sendAction({ type: 'buy', itemType, itemId, quantity }, currentState);
}

/**
 * Request a sell action.
 */
export function requestSellAction(
  currentState: CampaignState,
  itemType: 'ship' | 'primary' | 'secondary' | 'ammo' | 'scrap',
  itemId: string,
  quantity = 1,
): Promise<ActionResult> {
  return sendAction({ type: 'sell', itemType, itemId, quantity }, currentState);
}

/**
 * Request an equip action.
 */
export function requestEquipAction(
  currentState: CampaignState,
  shipId: string,
  slotIndex: number,
  storageIndex: number,
  bankSize: number,
  category: 'primary' | 'secondary',
): Promise<ActionResult> {
  return sendAction(
    { type: 'equip', shipId, slotIndex, storageIndex, bankSize, category },
    currentState,
  );
}

/**
 * Request an unequip action.
 */
export function requestUnequipAction(
  currentState: CampaignState,
  shipId: string,
  slotIndex: number,
  category: 'primary' | 'secondary',
): Promise<ActionResult> {
  return sendAction(
    { type: 'unequip', shipId, slotIndex, category },
    currentState,
  );
}

/**
 * Request a convert scrap action.
 */
export function requestConvertScrapAction(
  currentState: CampaignState,
  shipClass: string,
  quantity = 1,
): Promise<ActionResult> {
  return sendAction(
    { type: 'convertScrap', shipClass, quantity },
    currentState,
  );
}

/**
 * Request a resupply action.
 */
export function requestResupplyAction(
  currentState: CampaignState,
  shipId: string,
): Promise<ActionResult> {
  return sendAction({ type: 'resupply', shipId }, currentState);
}

/**
 * Request an assign pilot action.
 */
export function requestAssignPilotAction(
  currentState: CampaignState,
  pilotId: string,
  shipId: string,
): Promise<ActionResult> {
  return sendAction({ type: 'assignPilot', pilotId, shipId }, currentState);
}

/**
 * Request a deploy stored ship action.
 */
export function requestDeployStoredShipAction(
  currentState: CampaignState,
  pilotId: string,
  storedShipIndex: number,
): Promise<ActionResult> {
  return sendAction(
    { type: 'deployStoredShip', pilotId, storedShipIndex },
    currentState,
  );
}

/**
 * Request a resupply all action.
 */
export function requestResupplyAllAction(
  currentState: CampaignState,
  commanderId: string,
): Promise<ActionResult> {
  return sendAction({ type: 'resupplyAll', commanderId }, currentState);
}
