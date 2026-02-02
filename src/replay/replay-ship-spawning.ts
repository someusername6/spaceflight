/**
 * Replay Ship Spawning - spawns ships from recorded replay data.
 *
 * Uses exact weapon configurations from the recorded replay to ensure
 * deterministic playback. Unlike campaign spawning, this doesn't use
 * live campaign state.
 */

import type { Quaternion, Vector3 } from 'three';
import {
  createPrimaryWeaponsFromReplay,
  createSecondaryWeaponsFromReplay,
} from '../campaign/campaign-weapons';
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

  const config: ShipSpawnConfig = {
    world,
    stats,
    position,
    rotation,
    faction: Faction.Player,
    collisionRadiusMultiplier: 1.0,
    shipClassName: loadout.shipClass,
  };

  const entity = createShipEntity(config);

  // Player control
  addComponent(world, entity, createPlayerControlled());
  addComponent(
    world,
    entity,
    createShipIdentity(loadout.shipClass, 'Commander'),
  );
  addComponent(world, entity, createTargeting());

  // Weapons from replay loadout
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

  finalizeShip(config, entity);

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

  const config: ShipSpawnConfig = {
    world,
    stats,
    position,
    rotation,
    faction: Faction.Player,
    collisionRadiusMultiplier: 1.5,
    shipClassName: loadout.shipClass,
  };

  const entity = createShipEntity(config);

  // Callsign for UI display - use pilot name if available, otherwise generic 'Wingman'
  const callsign = pilotName ?? 'Wingman';
  addComponent(world, entity, createShipIdentity(loadout.shipClass, callsign));

  // AI setup - use pilot skill from replay or default to regular
  const profileName = (pilotSkill ?? 'regular') as ProfileName;
  const profile = getProfileForPlaystyle(profileName, 'brawler');
  const preferredRange = Math.floor(600 * profile.combatRangeMultiplier);
  addComponent(
    world,
    entity,
    createAIControlled(profile, preferredRange, undefined),
  );
  addComponent(world, entity, createAimError(world.prng, profile));

  // Weapons from replay loadout
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

  finalizeShip(config, entity);

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
    } as unknown as Vector3;
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
