/**
 * Ship Assignment Logic - Assign players to ships in multiplayer.
 *
 * Handles:
 * - Creating player pilots
 * - Assigning/unassigning players to ships
 * - Converting player pilots to AI when disconnected
 * - Finding available ships for assignment
 */

import type {
  CampaignState,
  OwnedShip,
  Pilot,
  SkillLevel,
} from '../campaign/types';
import type { LobbyPlayer } from './lobby-state';

// Re-export entity conversion functions for backward compatibility
export {
  convertPlayerShipToAIMission,
  findPlayerShipEntity,
} from './ship-entity-conversion';

// =============================================================================
// Types
// =============================================================================

/** Error codes for ship assignment failures */
export type ShipAssignmentError =
  | 'ship_not_found'
  | 'version_mismatch'
  | 'ship_occupied';

/** Successful ship assignment result */
export interface ShipAssignmentSuccess {
  success: true;
  /** Updated campaign state */
  newState: CampaignState;
}

/** Failed ship assignment result */
export interface ShipAssignmentFailure {
  success: false;
  /** Error code describing why assignment failed */
  error: ShipAssignmentError;
}

/** Result of a ship assignment operation (discriminated union) */
export type ShipAssignmentResult =
  | ShipAssignmentSuccess
  | ShipAssignmentFailure;

// =============================================================================
// Player Pilot Creation
// =============================================================================

/** Generate a unique ID for a player pilot */
function generatePlayerPilotId(playerId: string): string {
  return `mp-pilot-${playerId}`;
}

/**
 * Create a new pilot for a multiplayer player.
 * Player pilots have skill: 'player' which displays as "Player" in the UI.
 */
export function createPlayerPilot(playerId: string, callsign: string): Pilot {
  return {
    id: generatePlayerPilotId(playerId),
    name: callsign,
    skill: 'player',
    // Fresh stats
    kills: 0,
    assists: 0,
    missionsFlown: 0,
    missionsWon: 0,
    damageDealt: 0,
    damageReceived: 0,
    ejectionCount: 0,
    injuredMissionsLeft: 0,
    xp: 0,
  };
}

/**
 * Check if a pilot is a player-controlled pilot.
 */
export function isPlayerPilot(pilot: Pilot): boolean {
  return pilot.skill === 'player';
}

/**
 * Get the player ID from a player pilot's ID.
 * Returns null if not a player pilot ID.
 */
export function getPlayerIdFromPilot(pilot: Pilot): string | null {
  if (!pilot.id.startsWith('mp-pilot-')) {
    return null;
  }
  return pilot.id.slice('mp-pilot-'.length);
}

// =============================================================================
// Ship Assignment
// =============================================================================

/**
 * Assign a player to a ship.
 * Creates a player pilot if needed and assigns them to the ship.
 *
 * @param state - Current campaign state
 * @param playerId - Player's peer ID
 * @param callsign - Player's callsign
 * @param shipId - Ship ID to assign to
 * @param expectedVersion - Optional expected state version for conflict detection
 * @returns Assignment result with updated state
 */
export function assignPlayerToShip(
  state: CampaignState,
  playerId: string,
  callsign: string,
  shipId: string,
  expectedVersion?: number,
): ShipAssignmentResult {
  // Version check (if provided)
  if (expectedVersion !== undefined && expectedVersion !== state.stateVersion) {
    return { success: false, error: 'version_mismatch' };
  }

  // Find the target ship
  const shipIndex = state.ships.findIndex((s) => s.id === shipId);
  const ship = state.ships[shipIndex];
  if (shipIndex === -1 || !ship) {
    return { success: false, error: 'ship_not_found' };
  }

  // Check if ship is already assigned to another player
  if (ship.pilot && isPlayerPilot(ship.pilot)) {
    const existingPlayerId = getPlayerIdFromPilot(ship.pilot);
    if (existingPlayerId && existingPlayerId !== playerId) {
      // Ship is occupied by a different player
      return { success: false, error: 'ship_occupied' };
    }
  }

  // Find or create player pilot
  const pilotId = generatePlayerPilotId(playerId);
  let pilots = [...state.pilots];
  let playerPilot = pilots.find((p) => p.id === pilotId);

  if (!playerPilot) {
    // Create new player pilot
    playerPilot = createPlayerPilot(playerId, callsign);
    pilots = [...pilots, playerPilot];
  } else if (playerPilot.name !== callsign) {
    // Update callsign if changed
    const updatedPilot = { ...playerPilot, name: callsign };
    playerPilot = updatedPilot;
    pilots = pilots.map((p) => (p.id === pilotId ? updatedPilot : p));
  }

  // At this point playerPilot is guaranteed to be defined
  const finalPilot = playerPilot;

  // Unassign player from any current ship
  let ships = state.ships.map((s) => {
    if (s.pilot?.id === pilotId) {
      return { ...s, pilot: null };
    }
    return s;
  });

  // Assign player to target ship
  ships = ships.map((s, i) => {
    if (i === shipIndex) {
      return { ...s, pilot: finalPilot };
    }
    return s;
  });

  // Increment version on successful change
  const newState: CampaignState = {
    ...state,
    ships,
    pilots,
    stateVersion: state.stateVersion + 1,
  };

  return {
    success: true,
    newState,
  };
}

/**
 * Unassign a player from their ship.
 * The player's pilot remains in the roster but is no longer assigned.
 *
 * @param state - Current campaign state
 * @param playerId - Player's peer ID
 * @returns Updated campaign state
 */
export function unassignPlayer(
  state: CampaignState,
  playerId: string,
): CampaignState {
  const pilotId = generatePlayerPilotId(playerId);

  // Find and unassign from any ship
  const ships = state.ships.map((s) => {
    if (s.pilot?.id === pilotId) {
      return { ...s, pilot: null };
    }
    return s;
  });

  return { ...state, ships };
}

/**
 * Remove a player pilot completely from the campaign.
 * Used when a player disconnects from the session.
 */
export function removePlayerPilot(
  state: CampaignState,
  playerId: string,
): CampaignState {
  const pilotId = generatePlayerPilotId(playerId);

  // Remove pilot from roster
  const pilots = state.pilots.filter((p) => p.id !== pilotId);

  // Unassign from any ship
  const ships = state.ships.map((s) => {
    if (s.pilot?.id === pilotId) {
      return { ...s, pilot: null };
    }
    return s;
  });

  return { ...state, ships, pilots };
}

// =============================================================================
// Player Pilot Conversion
// =============================================================================

/**
 * Convert a player pilot to an AI pilot.
 * Used when a player disconnects but their ship should remain active.
 *
 * @param state - Current campaign state
 * @param playerId - Player's peer ID
 * @param aiSkill - AI skill level for the converted pilot
 * @returns Updated campaign state
 */
export function convertPlayerPilotToAI(
  state: CampaignState,
  playerId: string,
  aiSkill: SkillLevel,
): CampaignState {
  const pilotId = generatePlayerPilotId(playerId);

  // Update pilot skill
  const pilots = state.pilots.map((p) => {
    if (p.id === pilotId) {
      return { ...p, skill: aiSkill };
    }
    return p;
  });

  // Update pilot in ship if assigned
  const ships = state.ships.map((s) => {
    if (s.pilot?.id === pilotId) {
      return {
        ...s,
        pilot: { ...s.pilot, skill: aiSkill },
      };
    }
    return s;
  });

  return { ...state, ships, pilots };
}

// =============================================================================
// Ship Queries
// =============================================================================

/**
 * Get ships available for player assignment.
 * Excludes the commander's ship and ships already assigned to players.
 *
 * @param state - Current campaign state
 * @param _players - Current lobby players (kept for API compatibility)
 * @param _hostPlayerId - Host's player ID (kept for API compatibility)
 * @returns List of ships available for assignment
 */
export function getAvailableShipsForAssignment(
  state: CampaignState,
  _players: LobbyPlayer[],
  _hostPlayerId: string,
): OwnedShip[] {
  return state.ships.filter((ship) => {
    // Skip commander's ship
    if (ship.pilot?.id === state.commanderId) {
      return false;
    }

    // Skip ships with player pilots (check campaign state, not lobby)
    if (ship.pilot && isPlayerPilot(ship.pilot)) {
      return false;
    }

    return true;
  });
}

/**
 * Get the ship a player is assigned to.
 */
export function getPlayerShip(
  state: CampaignState,
  playerId: string,
): OwnedShip | null {
  const pilotId = generatePlayerPilotId(playerId);
  return state.ships.find((s) => s.pilot?.id === pilotId) ?? null;
}

/**
 * Get the ship name for display.
 */
export function getShipDisplayName(ship: OwnedShip): string {
  // Capitalize first letter of ship class
  return ship.shipClass.charAt(0).toUpperCase() + ship.shipClass.slice(1);
}

// =============================================================================
// Host Ship Assignment
// =============================================================================

/**
 * Assign the host to their commander ship.
 * Called when the host creates/joins a multiplayer session.
 */
export function assignHostToCommanderShip(
  state: CampaignState,
  _hostPlayerId: string,
  _callsign: string,
): CampaignState {
  // Find the commander's ship
  const commanderShip = state.ships.find(
    (s) => s.pilot?.id === state.commanderId,
  );
  if (!commanderShip) {
    // No commander ship found - this shouldn't happen in a valid campaign
    return state;
  }

  // For the host, we don't create a separate player pilot.
  // The host controls the commander pilot directly.
  // The host's shipId in LobbyPlayer points to the commander's ship.
  return state;
}

/**
 * Get the commander's ship ID.
 */
export function getCommanderShipId(state: CampaignState): string | null {
  const commanderShip = state.ships.find(
    (s) => s.pilot?.id === state.commanderId,
  );
  return commanderShip?.id ?? null;
}

/**
 * Check if a ship is the commander's ship.
 */
export function isCommanderShip(state: CampaignState, shipId: string): boolean {
  const ship = state.ships.find((s) => s.id === shipId);
  return ship?.pilot?.id === state.commanderId;
}
