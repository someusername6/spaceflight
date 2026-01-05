/**
 * Shared helpers for combat stats tests
 */

import {
  createCombatStats,
  getOrCreateWeaponStats,
} from '../../../src/components/combat-stats.ts';
import { createFaction, Faction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createShipIdentity } from '../../../src/components/ship-identity.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  processRemovals,
  removeEntity,
} from '../../../src/core/ecs.ts';
import {
  handleShipDeath,
  initMatchStats,
  recordBeamFired,
  recordBeamHit,
  recordDamage,
  recordMissileHit,
  recordMissileLaunched,
  recordMissileSeduced,
  recordShotFired,
  recordShotHit,
} from '../../../src/systems/stats.ts';

// Re-export everything tests need
export {
  createCombatStats,
  getOrCreateWeaponStats,
  createFaction,
  Faction,
  createHealth,
  createShipIdentity,
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  processRemovals,
  removeEntity,
  handleShipDeath,
  initMatchStats,
  recordBeamFired,
  recordBeamHit,
  recordDamage,
  recordMissileHit,
  recordMissileLaunched,
  recordMissileSeduced,
  recordShotFired,
  recordShotHit,
};

/** Test state */
export let passed = 0;
export let failed = 0;

/** Reset test counts */
export function resetCounts() {
  passed = 0;
  failed = 0;
}

/** Run a test */
export function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

/** Assert a condition */
export function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

/** Assert approximate equality */
export function assertApprox(actual, expected, tolerance = 0.001, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

/** Create a test ship with combat stats */
export function createTestShip(world, isPlayer = false) {
  const entity = createEntity(world);
  addComponent(world, entity, createHealth(100, 50));
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createShipIdentity('fighter', `Test ${entity}`));
  addComponent(world, entity, createCombatStats());
  if (isPlayer) {
    addComponent(world, entity, { type: 'playerControlled', input: {} });
  }
  return entity;
}

/** Create a test enemy ship */
export function createTestEnemy(world) {
  const entity = createEntity(world);
  addComponent(world, entity, createHealth(100, 50));
  addComponent(world, entity, createFaction(Faction.Enemy));
  addComponent(world, entity, createShipIdentity('raider', `Enemy ${entity}`));
  addComponent(world, entity, createCombatStats());
  return entity;
}

/** Print summary and return exit code */
export function printSummary() {
  console.log('');
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  return failed > 0 ? 1 : 0;
}
