/**
 * Attack Station Mission Spawning - Entity spawning utilities.
 */

import { Quaternion, Vector3 } from 'three';
import { getComponent } from '../../core/ecs';
import { logDebug } from '../../core/logger';
import { randomRange } from '../../core/prng';
import type { Entity, World } from '../../core/types';
import { Faction } from '../../core/types';
import { createAIShip, createEnemyShip } from '../../factories/ship';
import { isHighDpsShip } from '../../systems/ai/ai-dps-utils';
import type { ContractEnemy } from '../types';

/** Distance from station to spawn enemy defenders */
export const DEFENDER_SPAWN_DISTANCE = 300;

/** Distance behind player to spawn friendly reinforcements */
export const REINFORCEMENT_SPAWN_DISTANCE = 300;

/**
 * Spawn an enemy defender near the station.
 */
export function spawnDefender(
  world: World,
  stationPosition: Vector3,
  spec: ContractEnemy,
  index: number,
): Entity {
  // Spawn at random position around station
  const angle = randomRange(world.prng, 0, Math.PI * 2);
  const distance = randomRange(
    world.prng,
    DEFENDER_SPAWN_DISTANCE * 0.8,
    DEFENDER_SPAWN_DISTANCE * 1.2,
  );

  const spawnX = stationPosition.x + Math.sin(angle) * distance;
  const spawnZ = stationPosition.z + Math.cos(angle) * distance;
  const spawnY = randomRange(world.prng, -30, 30);

  const spawnPos = new Vector3(spawnX, spawnY, spawnZ);

  // Face toward station
  const toStation = stationPosition.clone().sub(spawnPos).normalize();
  const forward = new Vector3(0, 0, -1);
  const rotation = new Quaternion().setFromUnitVectors(forward, toStation);

  const entity = createEnemyShip(
    world,
    spec.archetype,
    spawnPos,
    rotation,
    spec.skill,
    'Defender',
  );

  // Set station-defender behavior for smart target distribution
  const ai = getComponent(world, entity, 'aiControlled');
  if (ai) {
    ai.behaviorMode = 'station-defender';
  }

  logDebug(`[ATTACK STATION] Defender ${index + 1} spawned: ${spec.archetype}`);

  return entity;
}

/**
 * Spawn an initial allied NPC near the station (already engaged with defenders).
 */
export function spawnInitialAlly(
  world: World,
  stationPosition: Vector3,
  spec: ContractEnemy,
  index: number,
  dpsThreshold: number,
): Entity {
  // Spawn at random position around station (similar to defenders but on opposite side)
  const angle = randomRange(world.prng, 0, Math.PI * 2);
  const distance = randomRange(
    world.prng,
    DEFENDER_SPAWN_DISTANCE * 0.6,
    DEFENDER_SPAWN_DISTANCE * 1.0,
  );

  const spawnX = stationPosition.x + Math.sin(angle) * distance;
  const spawnZ = stationPosition.z + Math.cos(angle) * distance + 200; // Slightly toward player
  const spawnY = randomRange(world.prng, -30, 30);

  const spawnPos = new Vector3(spawnX, spawnY, spawnZ);

  // Face toward station
  const toStation = stationPosition.clone().sub(spawnPos).normalize();
  const forward = new Vector3(0, 0, -1);
  const rotation = new Quaternion().setFromUnitVectors(forward, toStation);

  const entity = createAIShip(
    world,
    spec.archetype,
    Faction.Player,
    spawnPos,
    rotation,
    spec.skill,
    'Vanguard',
  );

  // Assign DPS-based behavior
  const ai = getComponent(world, entity, 'aiControlled');
  if (ai) {
    ai.behaviorMode = isHighDpsShip(world, entity, dpsThreshold)
      ? 'station-assault-high-dps'
      : 'station-assault-low-dps';
  }

  logDebug(
    `[ATTACK STATION] Initial ally ${index + 1} spawned: ${spec.archetype}`,
  );

  return entity;
}

/**
 * Spawn a friendly reinforcement behind the player.
 */
export function spawnReinforcement(
  world: World,
  playerPosition: Vector3,
  spec: ContractEnemy,
  index: number,
  dpsThreshold: number,
): Entity {
  // Spawn behind player (positive Z from player position)
  const lateralOffset = randomRange(world.prng, -50, 50);
  const depthOffset = randomRange(
    world.prng,
    REINFORCEMENT_SPAWN_DISTANCE,
    REINFORCEMENT_SPAWN_DISTANCE + 100,
  );

  const spawnPos = new Vector3(
    playerPosition.x + lateralOffset,
    playerPosition.y + randomRange(world.prng, -20, 20),
    playerPosition.z + depthOffset,
  );

  // Face toward negative Z (toward station)
  const rotation = new Quaternion();

  const entity = createAIShip(
    world,
    spec.archetype,
    Faction.Player,
    spawnPos,
    rotation,
    spec.skill,
    'Rescue',
  );

  // Assign DPS-based behavior
  const ai = getComponent(world, entity, 'aiControlled');
  if (ai) {
    ai.behaviorMode = isHighDpsShip(world, entity, dpsThreshold)
      ? 'station-assault-high-dps'
      : 'station-assault-low-dps';
  }

  logDebug(
    `[ATTACK STATION] Reinforcement ${index + 1} spawned: ${spec.archetype}`,
  );

  return entity;
}
