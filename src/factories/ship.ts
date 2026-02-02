/**
 * Ship entity factory - creates ship entities from archetypes.
 *
 * Archetypes define both ship stats and weapon loadouts.
 * For campaign/replay ships that use custom loadouts, see:
 * - campaign/ship-spawning.ts (campaign ships)
 * - replay/replay-ship-spawning.ts (replay reconstruction)
 */

import type { Quaternion, Vector3 } from 'three';
import { createAIControlled } from '../components/ai';
import { createAimError } from '../components/aim-error';
import { createSecondaryWeaponFromDef } from '../components/missile';
import { createPlayerControlled } from '../components/player';
import {
  createShipIdentity,
  generateCallsign,
} from '../components/ship-identity';
import { createTargeting } from '../components/targeting';
import {
  createPrimaryWeapons,
  createSecondaryWeapons,
} from '../components/weapons';
import { addComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction } from '../core/types';
import { getProfileForPlaystyle, type ProfileName } from '../data/ai-profiles';
import { getWeaponStats } from '../data/weapons';
import { validateArchetypeLoadout } from './archetype-validation';
import { ENEMY_ARCHETYPES } from './enemy-archetypes/index';
import { SHIP_ARCHETYPES, type ShipStats } from './ship-archetypes';
import {
  createShipEntity,
  finalizeShip,
  type ShipSpawnConfig,
} from './ship-builder';

export type { SecondaryBankSpec, ShipStats } from './ship-archetypes';

// Re-export for external use
export { addHullColliderFromClass } from './ship-builder';

/** Get archetype stats from either player or enemy archetypes */
export function getArchetype(name: string): ShipStats | undefined {
  return SHIP_ARCHETYPES[name] ?? ENEMY_ARCHETYPES[name];
}

/**
 * Calculate preferred combat range from weapon loadout.
 * Returns a range that ensures the ship's shortest-range weapon can be used.
 * This makes AI behavior adapt to the actual weapons equipped.
 */
function calculatePreferredCombatRange(stats: ShipStats): number {
  // If explicitly set, use that value
  if (stats.preferredCombatRange !== undefined) {
    return stats.preferredCombatRange;
  }

  // Find the shortest-range primary weapon
  let shortestRange = Infinity;

  for (const weaponSpec of stats.primaryWeapons) {
    const weaponStats = getWeaponStats(weaponSpec.name);
    if (
      weaponStats &&
      weaponStats.range > 0 &&
      weaponStats.range < shortestRange
    ) {
      shortestRange = weaponStats.range;
    }
  }

  // If no weapons found, use default engage range
  if (shortestRange === Infinity) {
    return 600; // Default
  }

  // Set preferred range to 90% of shortest weapon range
  // This ensures the AI closes enough for all weapons to be effective
  return Math.floor(shortestRange * 0.9);
}

// Re-export for backwards compatibility
export { SHIP_ARCHETYPES } from './ship-archetypes';

/** Creates a player-controlled ship from an archetype */
export function createPlayerShip(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion,
): Entity {
  const stats = getArchetype(archetype);
  if (!stats) {
    throw new Error(`Unknown ship archetype: ${archetype}`);
  }

  // Validate loadout on ship creation (catches runtime modifications)
  validateArchetypeLoadout(archetype);

  const config: ShipSpawnConfig = {
    world,
    stats,
    position,
    rotation,
    faction: Faction.Player,
    collisionRadiusMultiplier: 1.0,
    shipClassName: stats.shipClassName,
  };

  const entity = createShipEntity(config);

  // Player control
  addComponent(world, entity, createPlayerControlled());
  addComponent(world, entity, createShipIdentity(archetype, 'Alpha 1'));
  addComponent(world, entity, createTargeting());

  // Weapons from archetype definition
  addComponent(world, entity, createPrimaryWeapons(stats.primaryWeapons));
  if (stats.secondaryWeapons && stats.secondaryWeapons.length > 0) {
    const secondaryWeapons = stats.secondaryWeapons.map((w) =>
      createSecondaryWeaponFromDef(w.name, w.count, w.size),
    );
    addComponent(world, entity, createSecondaryWeapons(secondaryWeapons));
  }

  finalizeShip(config, entity);

  return entity;
}

/** Creates an AI-controlled ship from an archetype */
export function createAIShip(
  world: World,
  archetype: string,
  faction: Faction,
  position?: Vector3,
  rotation?: Quaternion,
  profileName: ProfileName = 'regular',
  callsignPrefix?: string,
): Entity {
  const stats = getArchetype(archetype);
  if (!stats) {
    throw new Error(`Unknown ship archetype: ${archetype}`);
  }

  // Validate loadout on ship creation (catches runtime modifications)
  validateArchetypeLoadout(archetype);

  const config: ShipSpawnConfig = {
    world,
    stats,
    position,
    rotation,
    faction,
    collisionRadiusMultiplier: 1.5, // AI has larger hitbox
    shipClassName: stats.shipClassName,
  };

  const entity = createShipEntity(config);

  // Generate callsign: use provided prefix, or default based on faction
  const prefix =
    callsignPrefix ?? (faction === Faction.Player ? 'Alpha' : 'Bandit');
  const callsign = generateCallsign(world, prefix);
  addComponent(world, entity, createShipIdentity(archetype, callsign));

  // Create AI with profile modified for archetype's playstyle
  const playstyle = stats.playstyle ?? 'brawler';
  const profile = getProfileForPlaystyle(profileName, playstyle);

  // Calculate preferred combat range from weapon loadout, scaled by skill
  const baseRange = calculatePreferredCombatRange(stats);
  const preferredRange = Math.floor(baseRange * profile.combatRangeMultiplier);

  // Scale flee distance by profile's fleeDistanceMultiplier
  const fleeDistance = stats.fleeDistance
    ? Math.floor(stats.fleeDistance * profile.fleeDistanceMultiplier)
    : undefined;

  const ai = createAIControlled(profile, preferredRange, fleeDistance);
  addComponent(world, entity, ai);
  addComponent(world, entity, createAimError(world.prng, profile));

  // Weapons from archetype definition
  addComponent(world, entity, createPrimaryWeapons(stats.primaryWeapons));
  if (stats.secondaryWeapons && stats.secondaryWeapons.length > 0) {
    const secondaryWeapons = stats.secondaryWeapons.map((w) =>
      createSecondaryWeaponFromDef(w.name, w.count, w.size),
    );
    addComponent(world, entity, createSecondaryWeapons(secondaryWeapons));
  }

  finalizeShip(config, entity);

  return entity;
}

/** Creates an enemy ship (convenience wrapper) */
export function createEnemyShip(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion,
  profileName: ProfileName = 'regular',
  callsignPrefix?: string,
): Entity {
  return createAIShip(
    world,
    archetype,
    Faction.Enemy,
    position,
    rotation,
    profileName,
    callsignPrefix,
  );
}

/** Creates an allied AI ship (wingman) */
export function createWingman(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion,
  profileName: ProfileName = 'regular',
): Entity {
  return createAIShip(
    world,
    archetype,
    Faction.Player,
    position,
    rotation,
    profileName,
  );
}
