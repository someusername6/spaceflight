/**
 * Replay Ship Spawning
 *
 * Functions to spawn player and wingman ships from replay loadout data.
 * Extracted from mission-setup.ts for file size management.
 */

import type { Quaternion, Vector3 } from 'three';
import {
  createPrimaryWeaponsFromReplay,
  createSecondaryWeaponsFromReplay,
} from '../campaign/campaign-weapons';
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
import type { ReplayShipLoadout, ReplayWingman } from './types';

/**
 * Spawn player ship from replay loadout data.
 * Uses exact weapon configuration from the recorded replay.
 */
export function spawnPlayerFromReplayLoadout(
  world: World,
  loadout: ReplayShipLoadout,
  position: Vector3,
  rotation: Quaternion,
): Entity {
  const stats = SHIP_CLASSES[loadout.shipClass];
  if (!stats) {
    throw new Error(`Unknown ship class: ${loadout.shipClass}`);
  }

  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(position.x, position.y, position.z, rotation),
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

  const physics = getComponent(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, rotation, INITIAL_SPAWN_SPEED);
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
    createShipIdentity(loadout.shipClass, 'Commander'),
  );
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));

  // Use exact weapons from replay loadout
  if (loadout.primaryWeapons.length > 0) {
    addComponent(
      world,
      entity,
      createPrimaryWeaponsFromReplay(loadout.primaryWeapons),
    );
  }

  if (loadout.secondaryWeapons.length > 0) {
    addComponent(
      world,
      entity,
      createSecondaryWeaponsFromReplay(loadout.secondaryWeapons),
    );
  }

  addComponent(world, entity, createCollision(stats.collisionRadius));
  addHullColliderFromClass(world, entity, loadout.shipClass, false);
  addComponent(world, entity, createCombatStats());
  initWeaponAmmoCounts(world, entity);

  return entity;
}

/**
 * Spawn wingman from replay loadout data.
 * Uses exact weapon configuration from the recorded replay.
 */
export function spawnWingmanFromReplayLoadout(
  world: World,
  loadout: ReplayShipLoadout,
  position: Vector3,
  rotation: Quaternion,
  pilotName?: string,
  pilotSkill?: string,
): Entity {
  const stats = SHIP_CLASSES[loadout.shipClass];
  if (!stats) {
    throw new Error(`Unknown ship class: ${loadout.shipClass}`);
  }

  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(position.x, position.y, position.z, rotation),
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

  const physics = getComponent(world, entity, 'physics');
  if (physics) {
    setInitialVelocity(physics, rotation, INITIAL_SPAWN_SPEED);
  }

  addComponent(world, entity, createHealth(stats.hull, stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(Faction.Player));

  // Callsign for UI display - use pilot name if available, otherwise generic 'Wingman'
  const callsign = pilotName ?? 'Wingman';
  addComponent(world, entity, createShipIdentity(loadout.shipClass, callsign));

  // AI setup - use pilot skill from replay or default to regular
  // Note: Component order matches live gameplay (ship-spawning.ts)
  const profileName = (pilotSkill ?? 'regular') as ProfileName;
  const profile = getProfileForPlaystyle(profileName, 'brawler');
  const preferredRange = Math.floor(600 * profile.combatRangeMultiplier);
  addComponent(
    world,
    entity,
    createAIControlled(profile, preferredRange, undefined),
  );
  addComponent(world, entity, createAimError(world.prng, profile));

  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));

  // Use exact weapons from replay loadout
  if (loadout.primaryWeapons.length > 0) {
    addComponent(
      world,
      entity,
      createPrimaryWeaponsFromReplay(loadout.primaryWeapons),
    );
  }

  if (loadout.secondaryWeapons.length > 0) {
    addComponent(
      world,
      entity,
      createSecondaryWeaponsFromReplay(loadout.secondaryWeapons),
    );
  }

  addComponent(world, entity, createCollision(stats.collisionRadius * 1.5));
  addHullColliderFromClass(world, entity, loadout.shipClass, false);
  addComponent(world, entity, createCombatStats());
  initWeaponAmmoCounts(world, entity);

  return entity;
}

/**
 * Spawn all wingmen from replay data at their recorded positions.
 */
export function spawnWingmenFromReplay(
  world: World,
  wingmen: ReplayWingman[],
  playerRotation: Quaternion,
): void {
  for (const wingman of wingmen) {
    const pos = {
      x: wingman.position.x,
      y: wingman.position.y,
      z: wingman.position.z,
    } as unknown as import('three').Vector3;
    spawnWingmanFromReplayLoadout(
      world,
      wingman.loadout,
      pos,
      playerRotation,
      wingman.pilotName,
      wingman.pilotSkill,
    );
  }
}
