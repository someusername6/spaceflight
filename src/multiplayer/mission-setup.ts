/**
 * Multiplayer Mission Setup - Build player-entity mappings after mission spawn.
 *
 * Maps players to their entities via ShipIdentity.campaignShipId, enabling
 * the game adapter to route inputs correctly in multiplayer missions.
 */

import type { PlayerId } from 'rollback-netcode';
import { asPlayerId } from 'rollback-netcode';
import { getLobbyContext } from '../campaign/handlers/lobby-context';
import { getCommanderShip } from '../campaign/state';
import { isDead } from '../components/health';
import { getComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { LobbyPlayer } from './lobby-state';

// =============================================================================
// Types
// =============================================================================

/** Result of setting up multiplayer mission entities */
export interface MultiplayerMissionSetup {
  /** Map from player ID to their controlled entity */
  playerEntityMap: Map<PlayerId, Entity>;
  /** Player IDs who are spectating (no ship assigned) */
  spectatorIds: string[];
  /** The local player's entity (null if spectating) */
  localPlayerEntity: Entity | null;
}

// =============================================================================
// Entity Mapping
// =============================================================================

/**
 * Build player-to-entity mapping after mission entities are spawned.
 * Matches players to entities via ShipIdentity.campaignShipId.
 *
 * @param world - The game world with spawned entities
 * @param players - Lobby players with ship assignments
 * @param localPlayerId - The local player's ID
 * @returns Mapping of players to entities and spectator list
 */
export function buildPlayerEntityMap(
  world: World,
  players: LobbyPlayer[],
  localPlayerId: string,
): MultiplayerMissionSetup {
  const playerEntityMap = new Map<PlayerId, Entity>();
  const spectatorIds: string[] = [];
  let localPlayerEntity: Entity | null = null;

  // Build shipId → playerId lookup
  const shipToPlayer = new Map<string, string>();
  for (const player of players) {
    if (player.shipId) {
      shipToPlayer.set(player.shipId, player.playerId);
    } else {
      spectatorIds.push(player.playerId);
    }
  }

  // Find entities and map to players
  for (const entity of queryEntities(world, [
    'shipIdentity',
    'playerControlled',
  ])) {
    const identity = getComponent(world, entity, 'shipIdentity');
    if (!identity?.campaignShipId) continue;

    const playerId = shipToPlayer.get(identity.campaignShipId);
    if (playerId) {
      playerEntityMap.set(asPlayerId(playerId), entity);
      if (playerId === localPlayerId) {
        localPlayerEntity = entity;
      }
    }
  }

  return { playerEntityMap, spectatorIds, localPlayerEntity };
}

/** Guest info for spawning */
export interface GuestShipInfo {
  callsign: string;
  autoaimDegrees: number;
}

/**
 * Get the map of ship IDs to guest info for multiplayer guests.
 * Used when spawning to determine which ships get PlayerControlled vs AIControlled,
 * and what callsign/autoaim to use for each guest.
 *
 * @param players - Lobby players with ship assignments
 * @param hostPlayerId - The host's player ID (host controls commander, not counted as guest)
 * @returns Map of ship ID → guest info for guests
 */
export function getGuestShipIds(
  players: LobbyPlayer[],
  hostPlayerId: string,
): Map<string, GuestShipInfo> {
  const guestShipMap = new Map<string, GuestShipInfo>();

  for (const player of players) {
    // Skip host - host controls commander via spawnPlayerFromCampaign
    if (player.playerId === hostPlayerId) continue;

    // Skip spectators (no ship assigned)
    if (!player.shipId) continue;

    guestShipMap.set(player.shipId, {
      callsign: player.callsign,
      autoaimDegrees: player.autoaimDegrees,
    });
  }

  return guestShipMap;
}

// =============================================================================
// Human Player Tracking (for defeat conditions)
// =============================================================================

/**
 * Count living human players in a multiplayer mission.
 *
 * In multiplayer, defeat occurs when ALL human players are dead, not just
 * the commander. This function counts how many human-controlled ships are
 * still alive.
 *
 * Human players are:
 * - The host (controls the commander ship)
 * - Guests with assigned ships (their shipId in LobbyPlayer)
 *
 * @param world - The game world
 * @param players - Lobby players from LobbyContext
 * @param commanderShipId - The commander ship's campaign ID (host controls this)
 * @returns Number of living human players (0 = defeat condition)
 */
export function countLivingHumanPlayers(
  world: World,
  players: LobbyPlayer[],
  commanderShipId: string,
): number {
  // Build set of all human player ship IDs
  const humanShipIds = new Set<string>();

  // Host controls commander ship
  humanShipIds.add(commanderShipId);

  // Guests control their assigned ships
  for (const player of players) {
    if (player.shipId) {
      humanShipIds.add(player.shipId);
    }
  }

  // Count living human-controlled entities
  let livingCount = 0;
  for (const entity of queryEntities(world, [
    'shipIdentity',
    'health',
    'playerControlled',
  ])) {
    const identity = getComponent(world, entity, 'shipIdentity');
    const health = getComponent(world, entity, 'health');
    if (!identity?.campaignShipId || !health) continue;
    if (isDead(health)) continue;

    // Check if this ship is controlled by a human
    if (humanShipIds.has(identity.campaignShipId)) {
      livingCount++;
    }
  }

  return livingCount;
}

/**
 * Check if ALL human players are dead in a multiplayer mission.
 *
 * This is the multiplayer-aware defeat condition check. Use this instead of
 * checking if any playerControlled entity is dead.
 *
 * @param world - The game world
 * @param players - Lobby players from LobbyContext
 * @param commanderShipId - The commander ship's campaign ID
 * @returns true if all human players are dead (defeat condition)
 */
export function areAllHumanPlayersDead(
  world: World,
  players: LobbyPlayer[],
  commanderShipId: string,
): boolean {
  return countLivingHumanPlayers(world, players, commanderShipId) === 0;
}

/**
 * Check if all playerControlled entities are dead (single-player defeat).
 *
 * @param world - The game world
 * @returns true if no living playerControlled entities exist
 */
export function areAllPlayersDeadSinglePlayer(world: World): boolean {
  for (const entity of queryEntities(world, ['playerControlled', 'health'])) {
    const health = getComponent(world, entity, 'health');
    if (health && !isDead(health)) return false;
  }
  return true;
}

/**
 * Check if all players are dead (defeat condition).
 *
 * This is the multiplayer-aware defeat check used by all mission systems.
 * In multiplayer: ALL human players must be dead for defeat.
 * In single-player: Any player death triggers defeat.
 *
 * @param world - The game world
 * @returns true if defeat condition is met
 */
export function isDefeatConditionMet(world: World): boolean {
  const lobbyCtx = getLobbyContext();
  if (lobbyCtx) {
    const campaignState = lobbyCtx.screenManager.campaignState;
    const commanderShip = campaignState && getCommanderShip(campaignState);
    if (commanderShip) {
      return areAllHumanPlayersDead(
        world,
        lobbyCtx.lobbyState.players,
        commanderShip.id,
      );
    }
  }
  return areAllPlayersDeadSinglePlayer(world);
}
