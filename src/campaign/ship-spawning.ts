/**
 * Campaign ship spawning - creates ships from campaign state with current loadouts.
 */

import { Quaternion, type Vector3 } from 'three';
import { createAIControlled } from '../components/ai';
import { createAimError } from '../components/aim-error';
import { createCollision } from '../components/collision';
import { createCombatStats } from '../components/combat-stats';
import { createFaction } from '../components/faction';
import { createHealth } from '../components/health';
import { createHeat } from '../components/heat';
import {
  createPhysics,
  INITIAL_SPAWN_SPEED,
  setInitialVelocity,
} from '../components/physics';
import { createPlayerControlled } from '../components/player';
import { createShieldHit } from '../components/shield-hit';
import { createShields } from '../components/shields';
import { createShipIdentity } from '../components/ship-identity';
import { createTargeting } from '../components/targeting';
import { createTransform } from '../components/transform';
import { addComponent, createEntity, getComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction } from '../core/types';
import { getProfileForPlaystyle, type ProfileName } from '../data/ai-profiles';
import { SHIP_CLASSES } from '../data/ships';
import { addHullColliderFromClass } from '../factories/ship';
import { initWeaponAmmoCounts } from '../systems/stats';
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

  const entity = createEntity(world);
  const shipRotation = rotation ?? new Quaternion();
  const spawnSpeed = initialSpeed ?? INITIAL_SPAWN_SPEED;

  addComponent(
    world,
    entity,
    createTransform(
      position?.x ?? 0,
      position?.y ?? 0,
      position?.z ?? 0,
      shipRotation,
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
      initialSpeed: spawnSpeed,
    }),
  );

  // Set initial velocity in forward direction
  const physics = getComponent(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, shipRotation, spawnSpeed);
  }

  addComponent(world, entity, createHealth(stats.hull, stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createPlayerControlled(isLocalPlayer));
  addComponent(
    world,
    entity,
    createShipIdentity(ship.shipClass, 'Commander', ship.id),
  );
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));

  // Use campaign loadout instead of archetype defaults (filter out empty slots)
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

  addComponent(world, entity, createCollision(stats.collisionRadius));
  addHullColliderFromClass(world, entity, ship.shipClass, false);
  addComponent(world, entity, createCombatStats());
  initWeaponAmmoCounts(world, entity);

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

  const entity = createEntity(world);
  const shipRotation = rotation ?? new Quaternion();
  const spawnSpeed = initialSpeed ?? INITIAL_SPAWN_SPEED;

  addComponent(
    world,
    entity,
    createTransform(
      position?.x ?? 0,
      position?.y ?? 0,
      position?.z ?? 0,
      shipRotation,
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
      initialSpeed: spawnSpeed,
    }),
  );

  // Set initial velocity in forward direction
  const physics = getComponent(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, shipRotation, spawnSpeed);
  }

  addComponent(world, entity, createHealth(stats.hull, stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(Faction.Player));

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
  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));

  // Use campaign loadout (filter out empty slots)
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

  addComponent(world, entity, createCollision(stats.collisionRadius * 1.5));
  addHullColliderFromClass(world, entity, ship.shipClass, false);
  addComponent(world, entity, createCombatStats());
  initWeaponAmmoCounts(world, entity);

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

  const entity = createEntity(world);
  const shipRotation = rotation ?? new Quaternion();
  const spawnSpeed = initialSpeed ?? INITIAL_SPAWN_SPEED;

  addComponent(
    world,
    entity,
    createTransform(
      position?.x ?? 0,
      position?.y ?? 0,
      position?.z ?? 0,
      shipRotation,
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
      initialSpeed: spawnSpeed,
    }),
  );

  // Set initial velocity in forward direction
  const physics = getComponent(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, shipRotation, spawnSpeed);
  }

  addComponent(world, entity, createHealth(stats.hull, stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(Faction.Player));

  // Callsign from pilot name
  const callsign = ship.pilot?.name ?? 'Wingman';
  addComponent(
    world,
    entity,
    createShipIdentity(ship.shipClass, callsign, ship.id),
  );

  // AI setup - default to brawler playstyle for campaign wingmen
  const profileName: ProfileName = ship.pilot?.skill ?? 'regular';
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

  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));

  // Use campaign loadout (filter out empty slots)
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

  addComponent(world, entity, createCollision(stats.collisionRadius * 1.5));
  addHullColliderFromClass(world, entity, ship.shipClass, false);
  addComponent(world, entity, createCombatStats());
  initWeaponAmmoCounts(world, entity);

  return entity;
}
