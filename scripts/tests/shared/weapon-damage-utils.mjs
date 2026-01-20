/**
 * Weapon Damage Test Utilities - Helpers for testing weapon damage vs all target types.
 */

import { Quaternion, Vector3 } from 'three';
import { createFaction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createPhysics } from '../../../src/components/physics.ts';
import { createShieldHit } from '../../../src/components/shield-hit.ts';
import { createShields } from '../../../src/components/shields.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createConvoyShipEntity } from '../../../src/factories/convoy-ship.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { createStationEntity } from '../../../src/factories/station.ts';
import { createCollision } from '../../../src/systems/collision.ts';
import {
  initCombatStats,
  runFrame,
  SYSTEMS,
  TICK_SEC,
} from './combat-utils.mjs';

// ============================================================================
// Target Creation Functions
// ============================================================================

/**
 * Create a simple enemy ship target at the specified position.
 * Uses 'scout' archetype for basic testing.
 * Ship is stopped to make hit testing deterministic.
 */
export function createEnemyShip(world, position = new Vector3(0, 0, 0)) {
  const ship = createAIShip(
    world,
    'scout',
    Faction.Enemy,
    position,
    new Quaternion(),
    'rookie',
    'Target',
  );

  // Stop the ship so it doesn't move during test
  const physics = getComponent(world, ship, 'physics');
  if (physics) {
    physics.velocity.set(0, 0, 0);
  }

  return ship;
}

/**
 * Create an enemy convoy ship at the specified position.
 * Convoy ships have hull colliders with useHullForWeapons = true.
 */
export function createEnemyConvoy(world, position = new Vector3(0, 0, 0)) {
  const destination = position.clone().add(new Vector3(0, 0, -1000));
  const convoy = createConvoyShipEntity(
    world,
    'freighter',
    position,
    destination,
    100, // escapeZoneRadius
    0, // index
    5, // jumpChargeTime
    { faction: Faction.Enemy },
  );
  return convoy;
}

/**
 * Create an enemy station at the specified position.
 * Stations have compound hull colliders with useHullForWeapons = true.
 */
export function createEnemyStation(world, position = new Vector3(0, 0, 0)) {
  const station = createStationEntity(world, position, {
    stationType: 'mining',
    health: 500,
    shields: 200,
  });
  // Override faction to enemy
  const faction = getComponent(world, station, 'faction');
  if (faction) faction.faction = Faction.Enemy;
  return station;
}

/**
 * Create a simple target entity with health and shields (no hull collider).
 * Useful for testing basic damage mechanics.
 */
export function createSimpleTarget(
  world,
  position = new Vector3(0, 0, 0),
  health = 100,
  shields = 50,
  collisionRadius = 10,
) {
  const entity = createEntity(world);
  addComponent(
    world,
    entity,
    createTransform(position.x, position.y, position.z),
  );
  addComponent(world, entity, createHealth(health));
  addComponent(world, entity, createShields(shields, 5, 2));
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(Faction.Enemy));
  addComponent(world, entity, createCollision(collisionRadius));
  addComponent(
    world,
    entity,
    createPhysics({ maxSpeed: 0, acceleration: 0, turnRate: 0, rollRate: 0 }),
  );
  return entity;
}

// ============================================================================
// Attacker Creation Functions
// ============================================================================

/**
 * Create a player ship with specific weapons for testing.
 */
export function createPlayerShip(
  world,
  archetype,
  position = new Vector3(0, 0, 200),
) {
  const ship = createAIShip(
    world,
    archetype,
    Faction.Player,
    position,
    new Quaternion(),
    'veteran',
    'Attacker',
  );
  return ship;
}

// ============================================================================
// Damage Measurement Functions
// ============================================================================

/**
 * Get total health (hull + shields) for an entity.
 */
export function getTotalHealth(world, entity) {
  const health = getComponent(world, entity, 'health');
  const shields = getComponent(world, entity, 'shields');
  return {
    hull: health?.hull ?? 0,
    maxHull: health?.maxHull ?? 0,
    shields: shields?.current ?? 0,
    maxShields: shields?.max ?? 0,
    total: (health?.hull ?? 0) + (shields?.current ?? 0),
  };
}

/**
 * Calculate damage dealt to an entity between two health snapshots.
 */
export function calculateDamage(before, after) {
  return {
    hullDamage: before.hull - after.hull,
    shieldDamage: before.shields - after.shields,
    totalDamage: before.total - after.total,
  };
}

// ============================================================================
// Simulation Functions
// ============================================================================

/**
 * Run simulation until damage is dealt or timeout.
 * Returns damage dealt and simulation time.
 */
export function runUntilDamage(world, target, maxTicks = 600) {
  const initialHealth = getTotalHealth(world, target);

  for (let tick = 0; tick < maxTicks; tick++) {
    runFrame(world);

    const currentHealth = getTotalHealth(world, target);
    const damage = calculateDamage(initialHealth, currentHealth);

    if (damage.totalDamage > 0) {
      return {
        success: true,
        damage,
        ticks: tick + 1,
        time: (tick + 1) * TICK_SEC,
        finalHealth: currentHealth,
      };
    }

    // Check if target is destroyed
    if (currentHealth.hull <= 0) {
      return {
        success: true,
        damage: calculateDamage(initialHealth, currentHealth),
        ticks: tick + 1,
        time: (tick + 1) * TICK_SEC,
        finalHealth: currentHealth,
        destroyed: true,
      };
    }
  }

  return {
    success: false,
    damage: { hullDamage: 0, shieldDamage: 0, totalDamage: 0 },
    ticks: maxTicks,
    time: maxTicks * TICK_SEC,
    finalHealth: getTotalHealth(world, target),
  };
}

/**
 * Run simulation for a fixed number of ticks.
 */
export function runForTicks(world, ticks) {
  for (let i = 0; i < ticks; i++) {
    runFrame(world);
  }
}

/**
 * Run simulation for a fixed time in seconds.
 */
export function runForTime(world, seconds) {
  const ticks = Math.ceil(seconds / TICK_SEC);
  runForTicks(world, ticks);
}

// ============================================================================
// Entity Counting Functions
// ============================================================================

/**
 * Count projectiles in the world.
 */
export function countProjectiles(world) {
  return [...queryEntities(world, ['projectile'])].length;
}

/**
 * Count missiles in the world.
 */
export function countMissiles(world) {
  return [...queryEntities(world, ['missile'])].length;
}

/**
 * Count shrapnel projectiles specifically.
 */
export function countShrapnel(world) {
  let count = 0;
  for (const entity of queryEntities(world, ['projectile'])) {
    const proj = getComponent(world, entity, 'projectile');
    if (proj?.isShrapnel) count++;
  }
  return count;
}

// ============================================================================
// World Setup Functions
// ============================================================================

/**
 * Create a test world with combat stats initialized.
 */
export function createTestWorld(seed = 12345) {
  const world = createWorld(seed);
  initCombatStats(world);
  world.systemState.gameTime = 10; // Start after any cooldowns
  return world;
}

/**
 * Get combat stats from the world.
 */
export function getCombatStats(world) {
  return world.systemState.combatStats;
}

// ============================================================================
// Exports
// ============================================================================

export { TICK_SEC, SYSTEMS, initCombatStats, runFrame };
