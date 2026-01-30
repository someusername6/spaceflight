/**
 * Multiplayer Mission Setup - Build player-entity mappings after mission spawn.
 *
 * Maps players to their entities via ShipIdentity.campaignShipId, enabling
 * the game adapter to route inputs correctly in multiplayer missions.
 */

import type { PlayerId } from 'rollback-netcode';
import { asPlayerId } from 'rollback-netcode';
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

/**
 * Get the map of ship IDs to callsigns for multiplayer guests.
 * Used when spawning to determine which ships get PlayerControlled vs AIControlled,
 * and what callsign to display for each guest.
 *
 * @param players - Lobby players with ship assignments
 * @param hostPlayerId - The host's player ID (host controls commander, not counted as guest)
 * @returns Map of ship ID → callsign for guests
 */
export function getGuestShipIds(
  players: LobbyPlayer[],
  hostPlayerId: string,
): Map<string, string> {
  const guestShipMap = new Map<string, string>();

  for (const player of players) {
    // Skip host - host controls commander via spawnPlayerFromCampaign
    if (player.playerId === hostPlayerId) continue;

    // Skip spectators (no ship assigned)
    if (!player.shipId) continue;

    guestShipMap.set(player.shipId, player.callsign);
  }

  return guestShipMap;
}
