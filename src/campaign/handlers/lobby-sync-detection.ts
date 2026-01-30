/**
 * Lobby Sync Detection - Detects ship assignment changes for multiplayer sync.
 *
 * Detects when campaign state changes require lobby state updates,
 * such as when player pilots are assigned/unassigned or ships are removed.
 */

import {
  getPlayerIdFromPilot,
  isPlayerPilot,
} from '../../multiplayer/ship-assignment';
import type { CampaignState } from '../types';
import type { LobbyContext } from './lobby-context';

// =============================================================================
// Types
// =============================================================================

/** Ship assignment change detected between campaign states */
export interface ShipAssignmentChange {
  playerId: string;
  shipId: string | null; // null = unassigned
}

// =============================================================================
// Detection Functions
// =============================================================================

/**
 * Detect player pilot ship assignment changes between old and new campaign state.
 * Returns changes needed to sync lobby state with campaign state.
 */
export function detectPlayerPilotChanges(
  oldState: CampaignState | null,
  newState: CampaignState,
): ShipAssignmentChange[] {
  if (!oldState) return [];

  const changes: ShipAssignmentChange[] = [];

  // Build map of playerId → shipId for old state
  const oldAssignments = new Map<string, string>();
  for (const ship of oldState.ships) {
    if (ship.pilot && isPlayerPilot(ship.pilot)) {
      const playerId = getPlayerIdFromPilot(ship.pilot);
      if (playerId) {
        oldAssignments.set(playerId, ship.id);
      }
    }
  }

  // Build map of playerId → shipId for new state
  const newAssignments = new Map<string, string>();
  for (const ship of newState.ships) {
    if (ship.pilot && isPlayerPilot(ship.pilot)) {
      const playerId = getPlayerIdFromPilot(ship.pilot);
      if (playerId) {
        newAssignments.set(playerId, ship.id);
      }
    }
  }

  // Detect unassignments: was assigned, now not assigned
  for (const [playerId, _oldShipId] of oldAssignments) {
    if (!newAssignments.has(playerId)) {
      changes.push({ playerId, shipId: null });
    }
  }

  // Detect new assignments: was not assigned, now assigned
  for (const [playerId, newShipId] of newAssignments) {
    if (!oldAssignments.has(playerId)) {
      changes.push({ playerId, shipId: newShipId });
    }
  }

  // Detect ship changes: was assigned to X, now assigned to Y
  for (const [playerId, newShipId] of newAssignments) {
    const oldShipId = oldAssignments.get(playerId);
    if (oldShipId && oldShipId !== newShipId) {
      changes.push({ playerId, shipId: newShipId });
    }
  }

  return changes;
}

/**
 * Detect lobby players whose assigned ship no longer exists in campaign state.
 * Returns player IDs whose shipId points to a ship not in newState.ships.
 *
 * This handles the case where a host unassigns a guest's ship via the squadron
 * screen (moving it to storage), making the guest a spectator.
 */
export function detectMissingShipAssignments(
  ctx: LobbyContext,
  newState: CampaignState,
): string[] {
  const missingPlayers: string[] = [];

  // Build set of valid ship IDs in campaign state
  const validShipIds = new Set(newState.ships.map((s) => s.id));

  // Check each lobby player's shipId
  for (const player of ctx.lobbyState.players) {
    if (player.shipId !== null && !validShipIds.has(player.shipId)) {
      missingPlayers.push(player.playerId);
    }
  }

  return missingPlayers;
}
