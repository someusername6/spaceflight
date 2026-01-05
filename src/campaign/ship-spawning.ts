/**
 * Campaign ship spawning - creates ships from campaign state with current loadouts.
 */

import type { Quaternion, Vector3 } from 'three';
import { createAIControlled } from '../components/ai';
import { createAimError } from '../components/aim-error';
import { createCollision } from '../components/collision';
import { createCombatStats } from '../components/combat-stats';
import { createFaction } from '../components/faction';
import { createHealth } from '../components/health';
import { createHeat } from '../components/heat';
import { createPhysics } from '../components/physics';
import { createPlayerControlled } from '../components/player';
import { createShieldHit } from '../components/shield-hit';
import { createShields } from '../components/shields';
import { createShipIdentity } from '../components/ship-identity';
import { createTargeting } from '../components/targeting';
import { createTransform } from '../components/transform';
import type {
  PrimaryWeapon,
  PrimaryWeapons,
  SecondaryWeapon,
  SecondaryWeapons,
} from '../components/weapons';
import {
  addComponent,
  createEntity,
  getComponent,
  queryEntities,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction } from '../core/types';
import { getProfileForPlaystyle, type ProfileName } from '../data/ai-profiles';
import { MISSILES } from '../data/missiles';
import { PRIMARY_WEAPONS } from '../data/weapons';
import { SHIP_ARCHETYPES } from '../factories/ship-archetypes';
import { initWeaponAmmoCounts } from '../systems/stats';
import type { EquippedPrimary, EquippedSecondary, OwnedShip } from './types';

/** Convert campaign EquippedPrimary to game PrimaryWeapon */
function createPrimaryFromEquipped(equipped: EquippedPrimary): PrimaryWeapon {
  const stats = PRIMARY_WEAPONS[equipped.weaponType];
  if (!stats) {
    throw new Error(`Unknown weapon type: ${equipped.weaponType}`);
  }

  const weapon: PrimaryWeapon = {
    name: equipped.weaponType,
    category: stats.category,
    heatPerShot: stats.heatPerShot / equipped.bankSize,
    projectileSpeed: stats.projectileSpeed,
    fireRate: stats.fireRate,
    range: stats.range,
    damage: stats.damage,
    bankSize: equipped.bankSize,
  };

  // Handle finite ammo
  if (stats.ammo !== undefined) {
    weapon.maxAmmo = stats.ammo * equipped.bankSize;
    weapon.ammo = equipped.currentAmmo ?? weapon.maxAmmo;
  }

  // Copy optional properties
  if (stats.flakRadius) weapon.flakRadius = stats.flakRadius;
  if (stats.shrapnelCount) weapon.shrapnelCount = stats.shrapnelCount;
  if (stats.isPulseBeam) weapon.isPulseBeam = stats.isPulseBeam;
  if (stats.pulseInterval) weapon.pulseInterval = stats.pulseInterval;
  if (stats.noFalloff) weapon.noFalloff = stats.noFalloff;
  if (stats.autoaimFov) weapon.autoaimFov = stats.autoaimFov;

  return weapon;
}

/** Convert campaign EquippedSecondary to game SecondaryWeapon */
function createSecondaryFromEquipped(
  equipped: EquippedSecondary,
): SecondaryWeapon {
  const stats = MISSILES[equipped.weaponType];
  if (!stats) {
    throw new Error(`Unknown secondary type: ${equipped.weaponType}`);
  }

  const weapon: SecondaryWeapon = {
    name: equipped.weaponType,
    requiresLock: stats.requiresLock,
    speed: stats.speed,
    turnRate: stats.turnRate,
    range: stats.range,
    damage: stats.damage,
    count: equipped.count,
    maxCount: equipped.maxCount,
    fireRate: stats.fireRate,
    lockSpeed: stats.lockSpeed,
    lockConeAngle: stats.lockConeAngle ?? 30,
    bankSize: equipped.bankSize,
  };

  // Only add optional properties if they have values
  if (stats.aoeRadius !== undefined) weapon.aoeRadius = stats.aoeRadius;
  if (stats.isNuke) weapon.isNuke = stats.isNuke;
  if (stats.isDecoy) weapon.isDecoy = stats.isDecoy;

  return weapon;
}

/** Create PrimaryWeapons component from campaign loadout */
function createPrimaryWeaponsFromCampaign(
  primaries: EquippedPrimary[],
): PrimaryWeapons {
  const weapons = primaries.map(createPrimaryFromEquipped);

  // Compute cached beam flags
  let beamCount = 0;
  for (const weapon of weapons) {
    if (weapon.category === 'beam') beamCount++;
  }

  // Compute unique weapon types in order of first appearance
  const seenTypes = new Set<string>();
  const weaponTypes: string[] = [];
  for (const weapon of weapons) {
    if (!seenTypes.has(weapon.name)) {
      seenTypes.add(weapon.name);
      weaponTypes.push(weapon.name);
    }
  }
  // Add 'all' mode at the end (only if multiple types)
  const linkModes =
    weaponTypes.length > 1 ? [...weaponTypes, 'all'] : weaponTypes;

  return {
    type: 'primaryWeapons',
    weapons,
    currentIndex: 0,
    lastFireTime: 0,
    linkMode: 0,
    linkModes,
    hasBeams: beamCount > 0,
    hasOnlyBeams: beamCount === weapons.length,
  };
}

/** Create SecondaryWeapons component from campaign loadout */
function createSecondaryWeaponsFromCampaign(
  secondaries: EquippedSecondary[],
): SecondaryWeapons {
  return {
    type: 'secondaryWeapons',
    weapons: secondaries.map(createSecondaryFromEquipped),
    currentIndex: 0,
    lastFireTime: 0,
    lockTarget: undefined,
    lockProgress: 0,
    lockWeaponIndex: -1,
  };
}

/** Spawn player ship from campaign state */
export function spawnPlayerFromCampaign(
  world: World,
  ship: OwnedShip,
  position?: Vector3,
  rotation?: Quaternion,
): Entity {
  const stats = SHIP_ARCHETYPES[ship.archetype];
  if (!stats) {
    throw new Error(`Unknown ship archetype: ${ship.archetype}`);
  }

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
    createShipIdentity(ship.archetype, 'Alpha 1', ship.id),
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
  const stats = SHIP_ARCHETYPES[ship.archetype];
  if (!stats) {
    throw new Error(`Unknown ship archetype: ${ship.archetype}`);
  }

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
    createShipIdentity(ship.archetype, callsign, ship.id),
  );

  // AI setup
  const profileName: ProfileName = ship.pilot?.skill ?? 'regular';
  const playstyle = stats.playstyle ?? 'brawler';
  const profile = getProfileForPlaystyle(profileName, playstyle);

  const baseRange = stats.preferredCombatRange ?? 600;
  const preferredRange = Math.floor(baseRange * profile.combatRangeMultiplier);
  const fleeDistance = stats.fleeDistance
    ? Math.floor(stats.fleeDistance * profile.fleeDistanceMultiplier)
    : undefined;

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
