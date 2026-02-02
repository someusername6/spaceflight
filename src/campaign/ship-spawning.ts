/**
 * Campaign ship spawning - creates ships from campaign state with current loadouts.
 *
 * Unlike archetype-based spawning (factories/ship.ts), campaign ships use:
 * - ShipClassStats from data/ships.ts for base stats
 * - Custom weapon loadouts from the campaign state
 */

import type { Quaternion, Vector3 } from 'three';
import { createAIControlled } from '../components/ai';
import { createAimError } from '../components/aim-error';
import { createPlayerControlled } from '../components/player';
import { createShipIdentity } from '../components/ship-identity';
import { createTargeting } from '../components/targeting';
import { addComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction } from '../core/types';
import { getProfileForPlaystyle, type ProfileName } from '../data/ai-profiles';
import { SHIP_CLASSES } from '../data/ships';
import {
  createShipEntity,
  finalizeShip,
  type ShipSpawnConfig,
} from '../factories/ship-builder';
import {
  createPrimaryWeaponsFromCampaign,
  createSecondaryWeaponsFromCampaign,
} from './campaign-weapons';
import { getOccupiedWeapons } from './slot-array';
import type { OwnedShip } from './types';

// Re-export ammo and replay functions
export {
  type ExtractedAmmo,
  extractAmmoFromWorld,
  shipToReplayLoadout,
} from './ship-ammo';

/**
 * Spawn player ship from campaign state.
 * @param isLocalPlayer - Whether this is the local player's ship (for multiplayer)
 */
export function spawnPlayerFromCampaign(
  world: World,
  ship: OwnedShip,
  position?: Vector3,
  rotation?: Quaternion,
  initialSpeed?: number,
  isLocalPlayer = true,
): Entity {
  const stats = SHIP_CLASSES[ship.shipClass];
  if (!stats) {
    throw new Error(`Unknown ship class: ${ship.shipClass}`);
  }

  const config: ShipSpawnConfig = {
    world,
    stats,
    position,
    rotation,
    initialSpeed,
    faction: Faction.Player,
    collisionRadiusMultiplier: 1.0,
    shipClassName: ship.shipClass,
  };

  const entity = createShipEntity(config);

  // Player control
  addComponent(world, entity, createPlayerControlled(isLocalPlayer));
  addComponent(
    world,
    entity,
    createShipIdentity(ship.shipClass, 'Commander', ship.id),
  );
  addComponent(world, entity, createTargeting());

  // Weapons from campaign loadout (filter out empty slots)
  const primaries = getOccupiedWeapons(ship.primaryWeapons);
  const secondaries = getOccupiedWeapons(ship.secondaryWeapons);

  addComponent(world, entity, createPrimaryWeaponsFromCampaign(primaries));
  if (secondaries.length > 0) {
    addComponent(
      world,
      entity,
      createSecondaryWeaponsFromCampaign(secondaries),
    );
  }

  finalizeShip(config, entity);

  return entity;
}

/**
 * Spawn a player-controlled wingman (for multiplayer guests).
 * Same as spawnWingmanFromCampaign but with PlayerControlled instead of AIControlled.
 *
 * @param callsign - Optional callsign override (player's lobby callsign). If not provided, uses pilot name.
 * @param isLocalPlayer - Whether this is the local player's ship (for multiplayer)
 */
export function spawnGuestFromCampaign(
  world: World,
  ship: OwnedShip,
  position?: Vector3,
  rotation?: Quaternion,
  initialSpeed?: number,
  callsign?: string,
  isLocalPlayer = false,
): Entity {
  const stats = SHIP_CLASSES[ship.shipClass];
  if (!stats) {
    throw new Error(`Unknown ship class: ${ship.shipClass}`);
  }

  const config: ShipSpawnConfig = {
    world,
    stats,
    position,
    rotation,
    initialSpeed,
    faction: Faction.Player,
    collisionRadiusMultiplier: 1.5,
    shipClassName: ship.shipClass,
  };

  const entity = createShipEntity(config);

  // Player-controlled (no AI, no aim error)
  addComponent(world, entity, createPlayerControlled(isLocalPlayer));

  // Use provided callsign (player's lobby callsign) or fall back to pilot name
  const displayCallsign = callsign ?? ship.pilot?.name ?? 'Wingman';
  addComponent(
    world,
    entity,
    createShipIdentity(ship.shipClass, displayCallsign, ship.id),
  );

  addComponent(world, entity, createTargeting());

  // Weapons from campaign loadout (filter out empty slots)
  const primaries = getOccupiedWeapons(ship.primaryWeapons);
  const secondaries = getOccupiedWeapons(ship.secondaryWeapons);

  addComponent(world, entity, createPrimaryWeaponsFromCampaign(primaries));
  if (secondaries.length > 0) {
    addComponent(
      world,
      entity,
      createSecondaryWeaponsFromCampaign(secondaries),
    );
  }

  finalizeShip(config, entity);

  return entity;
}

/** Spawn wingman from campaign state */
export function spawnWingmanFromCampaign(
  world: World,
  ship: OwnedShip,
  position?: Vector3,
  rotation?: Quaternion,
  initialSpeed?: number,
): Entity {
  const stats = SHIP_CLASSES[ship.shipClass];
  if (!stats) {
    throw new Error(`Unknown ship class: ${ship.shipClass}`);
  }

  const config: ShipSpawnConfig = {
    world,
    stats,
    position,
    rotation,
    initialSpeed,
    faction: Faction.Player,
    collisionRadiusMultiplier: 1.5,
    shipClassName: ship.shipClass,
  };

  const entity = createShipEntity(config);

  // Callsign from pilot name
  const callsign = ship.pilot?.name ?? 'Wingman';
  addComponent(
    world,
    entity,
    createShipIdentity(ship.shipClass, callsign, ship.id),
  );

  // AI setup - default to brawler playstyle for campaign wingmen
  // Get pilot's skill for this specific ship class, default to regular
  const pilotSkill = ship.pilot?.shipSkills[ship.shipClass];
  const profileName: ProfileName = pilotSkill ?? 'regular';
  const profile = getProfileForPlaystyle(profileName, 'brawler');

  const baseRange = 600; // Default combat range
  const preferredRange = Math.floor(baseRange * profile.combatRangeMultiplier);
  const fleeDistance: number | undefined = undefined; // No flee by default

  addComponent(
    world,
    entity,
    createAIControlled(profile, preferredRange, fleeDistance),
  );
  addComponent(world, entity, createAimError(world.prng, profile));

  // Weapons from campaign loadout (filter out empty slots)
  const primaries = getOccupiedWeapons(ship.primaryWeapons);
  const secondaries = getOccupiedWeapons(ship.secondaryWeapons);

  addComponent(world, entity, createPrimaryWeaponsFromCampaign(primaries));
  if (secondaries.length > 0) {
    addComponent(
      world,
      entity,
      createSecondaryWeaponsFromCampaign(secondaries),
    );
  }

  finalizeShip(config, entity);

  return entity;
}
