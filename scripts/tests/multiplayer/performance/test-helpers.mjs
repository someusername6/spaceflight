/**
 * Shared helpers for multiplayer performance tests.
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld } from '../../../../src/core/ecs.ts';
import { Faction } from '../../../../src/core/types.ts';
import {
  createAIShip,
  createPlayerShip,
} from '../../../../src/factories/ship.ts';
import { initCombatStats } from '../../shared/combat-utils.mjs';
import { createTestInput } from '../unit/test-utils.mjs';

/**
 * Create a 4-player world with typical battle entities.
 */
export function create4PlayerBattleWorld(seed = 42) {
  const world = createWorld(seed);
  initCombatStats(world);

  const playerEntities = [];

  // 4 player ships
  for (let i = 0; i < 4; i++) {
    const pos = new Vector3(i * 100, 0, 0);
    const entity = createPlayerShip(world, 'fighter', pos, new Quaternion());
    playerEntities.push(entity);
  }

  // 6 enemies (typical mission)
  const enemyRot = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  for (let i = 0; i < 6; i++) {
    createAIShip(
      world,
      'fighter',
      Faction.Enemy,
      new Vector3(i * 80 - 200, 0, -1500),
      enemyRot,
      'regular',
    );
  }

  return { world, playerEntities };
}

/**
 * Generate player inputs for benchmarking.
 */
export function generateInputsForTick(tick) {
  return {
    p1: createTestInput(tick < 120, tick % 10 === 0),
    p2: createTestInput(tick < 150, tick % 12 === 0),
    p3: createTestInput(tick < 100, tick % 8 === 0),
    p4: createTestInput(tick < 180, tick % 15 === 0),
  };
}

export { createTestInput };
