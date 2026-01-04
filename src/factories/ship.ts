/**
 * Ship entity factory - creates ship entities with all required components.
 */

import type { Quaternion, Vector3 } from 'three';
import { createAIControlled } from '../components/ai';
import { createAimError } from '../components/aim-error';
import { createCollision } from '../components/collision';
import { createFaction } from '../components/faction';
import { createHealth } from '../components/health';
import { createHeat } from '../components/heat';
import { createSecondaryWeaponFromDef } from '../components/missile';
import { createPhysics } from '../components/physics';
import { createPlayerControlled } from '../components/player';
import { createShieldHit } from '../components/shield-hit';
import { createShields } from '../components/shields';
import {
  createShipIdentity,
  generateCallsign,
} from '../components/ship-identity';
import { createTargeting } from '../components/targeting';
import { createTransform } from '../components/transform';
import {
  createPrimaryWeapons,
  createSecondaryWeapons,
} from '../components/weapons';
import { addComponent, createEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction } from '../core/types';
import type { ProfileName } from '../data/ai-profiles';
import { getWeaponStats } from '../data/weapons';
import {
  SHIP_ARCHETYPES,
  type ShipStats,
  validateArchetypeLoadout,
} from './ship-archetypes';

export type { SecondaryBankSpec, ShipStats } from './ship-archetypes';

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

/** Creates a player-controlled ship */
export function createPlayerShip(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion,
): Entity {
  const stats = SHIP_ARCHETYPES[archetype];
  if (!stats) {
    throw new Error(`Unknown ship archetype: ${archetype}`);
  }

  // Validate loadout on ship creation (catches runtime modifications)
  validateArchetypeLoadout(archetype);

  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(
      position?.x ?? 0,
      position?.y ?? 0,
      position?.z ?? 0,
      rotation,
    ),
  );

  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: stats.maxSpeed,
      acceleration: stats.acceleration,
      turnRate: stats.turnRate,
      rollRate: stats.rollRate,
      afterburnerHeatRate: stats.afterburnerHeatRate,
    }),
  );

  addComponent(world, entity, createHealth(stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createPlayerControlled());
  addComponent(world, entity, createShipIdentity(archetype, 'Alpha 1'));
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));
  addComponent(world, entity, createPrimaryWeapons(stats.primaryWeapons));

  // Add secondary weapons if defined (count scaled by bank size)
  if (stats.secondaryWeapons && stats.secondaryWeapons.length > 0) {
    const secondaryWeapons = stats.secondaryWeapons.map((w) =>
      createSecondaryWeaponFromDef(w.name, w.count, w.size),
    );
    addComponent(world, entity, createSecondaryWeapons(secondaryWeapons));
  }

  addComponent(world, entity, createCollision(stats.collisionRadius));

  return entity;
}

/** Creates an AI-controlled ship */
export function createAIShip(
  world: World,
  archetype: string,
  faction: Faction,
  position?: Vector3,
  rotation?: Quaternion,
  profileName: ProfileName = 'regular',
): Entity {
  const stats = SHIP_ARCHETYPES[archetype];
  if (!stats) {
    throw new Error(`Unknown ship archetype: ${archetype}`);
  }

  // Validate loadout on ship creation (catches runtime modifications)
  validateArchetypeLoadout(archetype);

  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(
      position?.x ?? 0,
      position?.y ?? 0,
      position?.z ?? 0,
      rotation,
    ),
  );

  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: stats.maxSpeed,
      acceleration: stats.acceleration,
      turnRate: stats.turnRate,
      rollRate: stats.rollRate,
      afterburnerHeatRate: stats.afterburnerHeatRate,
    }),
  );

  addComponent(world, entity, createHealth(stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(faction));

  // Generate callsign based on faction
  const callsignPrefix = faction === Faction.Player ? 'Alpha' : 'Bandit';
  const callsign = generateCallsign(world, callsignPrefix);
  addComponent(world, entity, createShipIdentity(archetype, callsign));

  // Create AI with profile - aim error derived from profile
  // Calculate preferred combat range from weapon loadout (or use explicit value)
  const preferredRange = calculatePreferredCombatRange(stats);
  const ai = createAIControlled(profileName, preferredRange);
  addComponent(world, entity, ai);
  addComponent(world, entity, createAimError(world.prng, ai.profile));

  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));
  addComponent(world, entity, createPrimaryWeapons(stats.primaryWeapons));

  // Add secondary weapons if defined (AI can fire missiles too)
  if (stats.secondaryWeapons && stats.secondaryWeapons.length > 0) {
    const secondaryWeapons = stats.secondaryWeapons.map((w) =>
      createSecondaryWeaponFromDef(w.name, w.count, w.size),
    );
    addComponent(world, entity, createSecondaryWeapons(secondaryWeapons));
  }

  addComponent(world, entity, createCollision(stats.collisionRadius * 1.5)); // AI has larger hitbox

  return entity;
}

/** Creates an enemy ship (convenience wrapper) */
export function createEnemyShip(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion,
  profileName: ProfileName = 'regular',
): Entity {
  return createAIShip(
    world,
    archetype,
    Faction.Enemy,
    position,
    rotation,
    profileName,
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
