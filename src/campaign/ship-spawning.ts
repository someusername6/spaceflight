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
import type {
  ReplayPrimaryWeapon,
  ReplaySecondaryWeapon,
  ReplayShipLoadout,
} from '../replay/types';
import { initWeaponAmmoCounts } from '../systems/stats';
import {
  createPrimaryWeaponsFromCampaign,
  createSecondaryWeaponsFromCampaign,
} from './campaign-weapons';
import { getOccupiedWeapons } from './slot-array';
import type { EquippedPrimary, EquippedSecondary, OwnedShip } from './types';

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
  const physics = getComponent(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, shipRotation, INITIAL_SPAWN_SPEED);
  }

  addComponent(world, entity, createHealth(stats.hull, stats.hull));
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
  const physics = getComponent(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, shipRotation, INITIAL_SPAWN_SPEED);
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
    const identity = getComponent(world, entity, 'shipIdentity');
    if (!identity?.campaignShipId) continue;

    const extracted: ExtractedAmmo = {
      campaignShipId: identity.campaignShipId,
      primaryAmmo: new Map(),
      secondaryAmmo: new Map(),
    };

    // Extract primary ammo
    const primaries = getComponent(world, entity, 'primaryWeapons');
    if (primaries) {
      for (let i = 0; i < primaries.weapons.length; i++) {
        const weapon = primaries.weapons[i];
        if (weapon?.ammo !== undefined) {
          extracted.primaryAmmo.set(i, weapon.ammo);
        }
      }
    }

    // Extract secondary ammo
    const secondaries = getComponent(world, entity, 'secondaryWeapons');
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

/**
 * Convert campaign ship loadout to replay format.
 * Used when recording replays to capture exact weapon configurations.
 */
export function shipToReplayLoadout(ship: OwnedShip): ReplayShipLoadout {
  const primaries = getOccupiedWeapons(ship.primaryWeapons);
  const secondaries = getOccupiedWeapons(ship.secondaryWeapons);

  return {
    shipClass: ship.shipClass,
    primaryWeapons: primaries.map((p: EquippedPrimary): ReplayPrimaryWeapon => {
      const weapon: ReplayPrimaryWeapon = {
        weaponId: p.weaponType,
        bankSize: p.bankSize,
      };
      // Only include ammo for ballistic weapons (has finite ammo)
      if (p.currentAmmo !== undefined) {
        weapon.ammo = p.currentAmmo;
        weapon.maxAmmo = p.currentAmmo; // At mission start, current = max
      }
      return weapon;
    }),
    secondaryWeapons: secondaries.map(
      (s: EquippedSecondary): ReplaySecondaryWeapon => ({
        weaponId: s.weaponType,
        bankSize: s.bankSize,
        ammo: s.count,
        maxAmmo: s.maxCount,
      }),
    ),
  };
}
