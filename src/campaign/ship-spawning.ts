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
import type { Physics } from '../components/physics';
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
import type { PrimaryWeapons, SecondaryWeapons } from '../components/weapons';
import {
  addComponent,
  createEntity,
  getComponent,
  queryEntities,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction } from '../core/types';
import { getProfileForPlaystyle, type ProfileName } from '../data/ai-profiles';
import { SHIP_CLASSES } from '../data/ships';
import { initWeaponAmmoCounts } from '../systems/stats';
import {
  createPrimaryWeaponsFromCampaign,
  createSecondaryWeaponsFromCampaign,
} from './campaign-weapons';
import type { OwnedShip } from './types';

/** Spawn player ship from campaign state */
export function spawnPlayerFromCampaign(
  world: World,
  ship: OwnedShip,
  position?: Vector3,
  rotation?: Quaternion,
): Entity {
  const stats = SHIP_CLASSES[ship.shipClass];
  if (!stats) {
    throw new Error(`Unknown ship class: ${ship.shipClass}`);
  }

  const entity = createEntity(world);
  const shipRotation = rotation ?? new Quaternion();

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
      initialSpeed: INITIAL_SPAWN_SPEED,
    }),
  );

  // Set initial velocity in forward direction
  const physics = getComponent<Physics>(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, shipRotation, INITIAL_SPAWN_SPEED);
  }

  const maxHull = stats.hull;
  const currentHull = maxHull - ship.hullDamage;
  addComponent(world, entity, createHealth(maxHull, currentHull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createPlayerControlled());
  addComponent(
    world,
    entity,
    createShipIdentity(ship.shipClass, 'Alpha 1', ship.id),
  );
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));

  // Use campaign loadout instead of archetype defaults
  addComponent(
    world,
    entity,
    createPrimaryWeaponsFromCampaign(ship.primaryWeapons),
  );

  if (ship.secondaryWeapons.length > 0) {
    addComponent(
      world,
      entity,
      createSecondaryWeaponsFromCampaign(ship.secondaryWeapons),
    );
  }

  addComponent(world, entity, createCollision(stats.collisionRadius));
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
): Entity {
  const stats = SHIP_CLASSES[ship.shipClass];
  if (!stats) {
    throw new Error(`Unknown ship class: ${ship.shipClass}`);
  }

  const entity = createEntity(world);
  const shipRotation = rotation ?? new Quaternion();

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
      initialSpeed: INITIAL_SPAWN_SPEED,
    }),
  );

  // Set initial velocity in forward direction
  const physics = getComponent<Physics>(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, shipRotation, INITIAL_SPAWN_SPEED);
  }

  const maxHull = stats.hull;
  const currentHull = maxHull - ship.hullDamage;
  addComponent(world, entity, createHealth(maxHull, currentHull));
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

  // Use campaign loadout
  addComponent(
    world,
    entity,
    createPrimaryWeaponsFromCampaign(ship.primaryWeapons),
  );

  if (ship.secondaryWeapons.length > 0) {
    addComponent(
      world,
      entity,
      createSecondaryWeaponsFromCampaign(ship.secondaryWeapons),
    );
  }

  addComponent(world, entity, createCollision(stats.collisionRadius * 1.5));
  addComponent(world, entity, createCombatStats());
  initWeaponAmmoCounts(world, entity);

  return entity;
}

/** Result of extracting ammo from a ship entity */
export interface ExtractedAmmo {
  campaignShipId: string;
  primaryAmmo: Map<number, number>; // bankIndex -> remaining ammo
  secondaryAmmo: Map<number, number>; // bankIndex -> remaining count
}

/** Extract remaining ammo from all player faction ships */
export function extractAmmoFromWorld(world: World): ExtractedAmmo[] {
  const results: ExtractedAmmo[] = [];

  // Query all entities with shipIdentity
  for (const entity of queryEntities(world, ['shipIdentity'])) {
    const identity = getComponent<
      import('../components/ship-identity').ShipIdentity
    >(world, entity, 'shipIdentity');
    if (!identity?.campaignShipId) continue;

    const extracted: ExtractedAmmo = {
      campaignShipId: identity.campaignShipId,
      primaryAmmo: new Map(),
      secondaryAmmo: new Map(),
    };

    // Extract primary ammo
    const primaries = getComponent<PrimaryWeapons>(
      world,
      entity,
      'primaryWeapons',
    );
    if (primaries) {
      for (let i = 0; i < primaries.weapons.length; i++) {
        const weapon = primaries.weapons[i];
        if (weapon?.ammo !== undefined) {
          extracted.primaryAmmo.set(i, weapon.ammo);
        }
      }
    }

    // Extract secondary ammo
    const secondaries = getComponent<SecondaryWeapons>(
      world,
      entity,
      'secondaryWeapons',
    );
    if (secondaries) {
      for (let i = 0; i < secondaries.weapons.length; i++) {
        const weapon = secondaries.weapons[i];
        if (weapon) {
          extracted.secondaryAmmo.set(i, weapon.count);
        }
      }
    }

    results.push(extracted);
  }

  return results;
}
