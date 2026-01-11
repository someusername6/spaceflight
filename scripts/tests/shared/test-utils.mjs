/**
 * Shared test utilities for all test files.
 *
 * Uses Node.js built-in test runner (node:test) and assertions (node:assert).
 * Re-exports commonly used test functions for convenience.
 */

import assert from 'node:assert';
import { describe, it, test } from 'node:test';
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

// ============================================================
// Custom Assertions
// ============================================================

/**
 * Assert approximate equality for floating point numbers.
 * @param {number} actual - Actual value
 * @param {number} expected - Expected value
 * @param {number} tolerance - Acceptable difference (default 0.001)
 * @param {string} message - Optional error message
 */
export function assertApprox(actual, expected, tolerance = 0.001, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      message ||
        `Expected ~${expected}, got ${actual} (tolerance: ${tolerance})`,
    );
  }
}

/**
 * Assert that a value is within a range.
 * @param {number} actual - Actual value
 * @param {number} min - Minimum expected
 * @param {number} max - Maximum expected
 * @param {string} message - Optional error message
 */
export function assertInRange(actual, min, max, message) {
  if (actual < min || actual > max) {
    throw new Error(
      message || `Expected ${actual} to be in range [${min}, ${max}]`,
    );
  }
}

// ============================================================
// Test World Helpers
// ============================================================

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

// ============================================================
// Re-exports
// ============================================================

// Node.js test runner
export { assert, describe, it, test };

// Three.js for vector operations
export { THREE };

// Faction enum
export { Faction } from '../../../src/components/faction.ts';
