/**
 * Replay Test Utilities
 *
 * Shared utilities for input replay and determinism testing.
 */

import { Quaternion, Vector3 } from 'three';
import {
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip, createPlayerShip } from '../../../src/factories/ship.ts';
import { InputPlayer } from '../../../src/input/input-recorder.ts';
import { aiSystem } from '../../../src/systems/ai/ai.ts';
import { aimErrorSystem } from '../../../src/systems/aim-error.ts';
import { cleanupSystem } from '../../../src/systems/cleanup.ts';
import { collisionSystem } from '../../../src/systems/collision.ts';
import { damageSystem } from '../../../src/systems/damage.ts';
import { decoySystem } from '../../../src/systems/decoys.ts';
import { explosionSystem } from '../../../src/systems/explosions.ts';
import { heatSystem } from '../../../src/systems/heat.ts';
import { inputSystem } from '../../../src/systems/input.ts';
import { missionSystem } from '../../../src/systems/mission.ts';
import { physicsSystem } from '../../../src/systems/physics.ts';
import { shieldSystem } from '../../../src/systems/shields.ts';
import { targetingSystem } from '../../../src/systems/targeting.ts';
import { beamSystem } from '../../../src/systems/weapons/beams.ts';
import { missileSystem } from '../../../src/systems/weapons/missiles.ts';
import { projectileSystem } from '../../../src/systems/weapons/projectiles.ts';
import { weaponSystem } from '../../../src/systems/weapons/weapons.ts';
import { initCombatStats, TICK_SEC } from './combat-utils.mjs';

/**
 * Bit positions for input flags.
 * Must match src/input/input-encoding.ts INPUT_BITS.
 * Used for generating test inputs without magic numbers.
 */
export const INPUT_BITS = {
  pitchUp: 0,
  pitchDown: 1,
  yawLeft: 2,
  yawRight: 3,
  rollLeft: 4,
  rollRight: 5,
  accelerate: 6,
  decelerate: 7,
  afterburner: 8,
  firePrimary: 9,
  fireSecondary: 10,
  launchDecoy: 11,
  cyclePrimary: 12,
  cycleSecondary: 13,
  cycleTargetNext: 14,
  cycleTargetPrev: 15,
  targetNearest: 16,
  toggleMatchSpeed: 17,
};

/** All systems in execution order (matching game.ts) */
const SYSTEMS = [
  inputSystem,
  targetingSystem,
  aiSystem,
  aimErrorSystem,
  weaponSystem,
  physicsSystem,
  beamSystem,
  projectileSystem,
  missileSystem,
  decoySystem,
  collisionSystem,
  damageSystem,
  shieldSystem,
  heatSystem,
  cleanupSystem,
  explosionSystem,
  missionSystem,
];

/**
 * Generate a scripted input sequence for testing.
 * Returns an array of bitmasks, one per tick.
 */
export function generateScriptedInputs(tickCount) {
  const inputs = [];

  for (let tick = 0; tick < tickCount; tick++) {
    let bits = 0;

    // Accelerate for first 2 seconds
    if (tick < 120) {
      bits |= 1 << INPUT_BITS.accelerate;
    }

    // Fire primary every 10 ticks after tick 60
    if (tick >= 60 && tick % 10 === 0) {
      bits |= 1 << INPUT_BITS.firePrimary;
    }

    // Yaw left for ticks 180-240
    if (tick >= 180 && tick < 240) {
      bits |= 1 << INPUT_BITS.yawLeft;
    }

    // Yaw right for ticks 300-360
    if (tick >= 300 && tick < 360) {
      bits |= 1 << INPUT_BITS.yawRight;
    }

    // Pitch up briefly around tick 400
    if (tick >= 400 && tick < 420) {
      bits |= 1 << INPUT_BITS.pitchUp;
    }

    // Target nearest at tick 30
    if (tick === 30) {
      bits |= 1 << INPUT_BITS.targetNearest;
    }

    inputs.push(bits);
  }

  return inputs;
}

/**
 * Compute a checksum of world state for comparison.
 * Includes entity count, positions, health, and PRNG state.
 */
export function computeWorldChecksum(world) {
  let hash = 0;

  // Include entity count
  hash ^= world.entities.size * 0x9e3779b9;

  // Include PRNG state
  hash ^= world.prng.state;

  // Include game time (scaled to int)
  hash ^= Math.floor(world.systemState.gameTime * 1000);

  // Include entity states
  for (const entity of world.entities) {
    const transform = getComponent(world, entity, 'transform');
    const health = getComponent(world, entity, 'health');
    const physics = getComponent(world, entity, 'physics');

    if (transform) {
      // Hash position (scaled to fixed point)
      hash ^= Math.floor(transform.position.x * 100) * 31;
      hash ^= Math.floor(transform.position.y * 100) * 37;
      hash ^= Math.floor(transform.position.z * 100) * 41;
    }

    if (health) {
      hash ^= Math.floor(health.current * 100) * 43;
    }

    if (physics) {
      hash ^= Math.floor(physics.speed * 100) * 47;
    }
  }

  return hash >>> 0; // Convert to unsigned 32-bit
}

/**
 * Run a battle simulation with scripted input.
 * Returns final world state checksum and metrics.
 */
export function runBattleSync(seed, scriptedInputs, maxTicks) {
  const world = createWorld(seed);
  initCombatStats(world);

  // Create player ship
  const playerPos = new Vector3(0, 0, 0);
  const playerRot = new Quaternion();
  createPlayerShip(world, 'fighter', playerPos, playerRot);

  // Create enemy ships
  const enemyRot = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  for (let i = 0; i < 2; i++) {
    const x = (i - 0.5) * 50;
    createAIShip(
      world,
      'fighter',
      Faction.Enemy,
      new Vector3(x, 0, -1500),
      enemyRot,
      'regular',
    );
  }

  // Create input player from scripted inputs
  const inputPlayer = new InputPlayer(scriptedInputs);

  // Run simulation with manual input application
  const actualTicks = Math.min(maxTicks, scriptedInputs.length);
  for (let tick = 0; tick < actualTicks; tick++) {
    world.systemState.gameTime += TICK_SEC;

    // Apply scripted input to player
    for (const entity of queryEntities(world, ['playerControlled'])) {
      const player = getComponent(world, entity, 'playerControlled');
      if (player) {
        inputPlayer.applyInputForTick(tick, player.input);
      }
    }

    // Run systems (skip inputSystem since we applied input manually)
    for (const system of SYSTEMS) {
      if (system !== inputSystem) {
        system(world, TICK_SEC);
      }
    }
  }

  // Count survivors
  let playerAlive = false;
  let enemyCount = 0;
  for (const entity of queryEntities(world, ['faction', 'health'])) {
    const faction = getComponent(world, entity, 'faction');
    const health = getComponent(world, entity, 'health');
    if (health && health.current > 0) {
      if (faction?.faction === Faction.Player) playerAlive = true;
      else if (faction?.faction === Faction.Enemy) enemyCount++;
    }
  }

  return {
    checksum: computeWorldChecksum(world),
    gameTime: world.systemState.gameTime,
    prngState: world.prng.state,
    entityCount: world.entities.size,
    playerAlive,
    enemyCount,
  };
}
