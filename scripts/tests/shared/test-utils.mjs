/**
 * Shared test utilities for all test files.
 */

import * as THREE from 'three';
import { createFaction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createMissile } from '../../../src/components/missile.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  processRemovals,
} from '../../../src/core/ecs.ts';
import {
  collisionSystem,
  createCollision,
} from '../../../src/systems/collision.ts';
import { missileSystem } from '../../../src/systems/weapons/missiles.ts';

// Test state
let passed = 0;
let failed = 0;

/** Run a test with error handling */
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

/** Assert approximate equality for floats */
export function assertApprox(actual, expected, tolerance = 0.001, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

/** Print test summary and exit with appropriate code */
export function summarize() {
  console.log('');
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

/** Reset test counters (for running multiple test suites) */
export function resetCounters() {
  passed = 0;
  failed = 0;
}

/** Create a test world with combat stats initialized */
export function createTestWorld(seed = 0) {
  const world = createWorld(seed);
  world.systemState.combatStats = {
    shotsFired: {},
    damageDealt: {},
    missilesFired: {},
    missilesHit: {},
    missileDamage: {},
    missilesExpired: 0,
    missilesHitOwner: 0,
    missilesSeduced: 0,
    beamDamage: {},
    decoysLaunched: 0,
    decoysSuccessful: 0,
  };
  return world;
}

/** Create a ship entity at given position */
export function createShip(world, x, y, z, faction, radius = 10) {
  const entity = createEntity(world);
  addComponent(world, entity, createTransform(x, y, z));
  addComponent(world, entity, createHealth(100));
  addComponent(world, entity, createFaction(faction));
  addComponent(world, entity, createCollision(radius));
  return entity;
}

/** Create a missile from owner */
export function createTestMissile(world, owner, x, y, z, opts = {}) {
  const {
    distanceTraveled = 0,
    damage = 100,
    speed = 400,
    turnRate = 90,
    range = 2000,
    target = undefined,
    direction = new THREE.Vector3(1, 0, 0),
    missileType = 'seeker',
  } = opts;

  const entity = createEntity(world);
  addComponent(world, entity, createTransform(x, y, z));
  const missileComp = createMissile(
    owner,
    target,
    damage,
    speed,
    turnRate,
    range,
    direction,
  );
  missileComp.distanceTraveled = distanceTraveled;
  missileComp.missileType = missileType;
  addComponent(world, entity, missileComp);
  addComponent(world, entity, createCollision(1));
  return entity;
}

/** Run one game frame with common systems */
export function runFrame(
  world,
  dt = 0.016,
  systems = [collisionSystem, missileSystem],
) {
  for (const system of systems) {
    system(world, dt);
  }
  processRemovals(world);
}

// Re-export commonly used items
export { Faction } from '../../../src/components/faction.ts';
export { THREE };
