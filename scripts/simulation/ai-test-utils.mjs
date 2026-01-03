/**
 * AI Test Utilities - Shared infrastructure for AI tests.
 */

import { createGame, tick } from '../../src/game.ts';
import { createPlayerShip, createEnemyShip } from '../../src/factories/ship.ts';
import { getComponent, queryEntities, entityExists } from '../../src/core/ecs.ts';
import { Faction } from '../../src/core/types.ts';
import { AIState } from '../../src/components/ai.ts';
import { isDying } from '../../src/components/health.ts';
import { Vector3 } from 'three';

// Test counters
let passed = 0;
let failed = 0;

export function resetCounters() {
  passed = 0;
  failed = 0;
}

export function getResults() {
  return { passed, failed };
}

export function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

export function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

export function assertEq(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
}

/** Run N simulation ticks */
export function tickN(game, n) {
  for (let i = 0; i < n; i++) tick(game);
}

/** Get AI component shorthand */
export function getAI(world, entity) {
  return getComponent(world, entity, 'aiControlled');
}

/** Get component shorthand */
export function get(world, entity, type) {
  return getComponent(world, entity, type);
}

/** Count entities with specific AI state */
export function countInState(world, state) {
  let count = 0;
  for (const e of queryEntities(world, ['aiControlled'])) {
    if (getAI(world, e).state === state) count++;
  }
  return count;
}

/** Count projectiles in world */
export function countProjectiles(world) {
  return [...queryEntities(world, ['projectile'])].length;
}

// Re-export commonly used items
export {
  createGame,
  tick,
  createPlayerShip,
  createEnemyShip,
  getComponent,
  queryEntities,
  entityExists,
  Faction,
  AIState,
  isDying,
  Vector3,
};
