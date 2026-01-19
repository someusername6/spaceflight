/**
 * Tests for playerThreatRatio Parameter
 *
 * Verifies that enemies are assigned behavior modes correctly based on
 * the playerThreatRatio setting in escort and station defense missions.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { spawnEscortEnemy } from '../../../src/campaign/mission/escort-launcher.ts';
import { setEnemiesToStationHunter } from '../../../src/campaign/mission/station-defense-launcher.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { createConvoyShipEntity } from '../../../src/factories/convoy-ship.ts';
import { createEnemyShip } from '../../../src/factories/ship.ts';

/** Create a minimal escort data object for testing */
function createTestEscortData(playerThreatRatio = 0) {
  return {
    playerThreatRatio,
    convoySize: 3,
    convoyType: 'freighter',
    escapeZoneDistance: 5000,
    escapeZoneRadius: 200,
    jumpChargeTime: 10,
    spawnInterval: 15,
    enemyPool: [{ archetype: 'fighter', skill: 'regular', count: 1 }],
    maxConcurrentEnemies: 8,
  };
}

describe('playerThreatRatio for escort missions', () => {
  it('assigns convoy-hunter to all enemies when ratio is 0', () => {
    const world = createWorld(12345);
    const escortData = createTestEscortData(0);
    const escapeZonePosition = new Vector3(0, 0, 5000);

    // Spawn convoy ships (required for spawnEscortEnemy)
    createConvoyShipEntity(
      world,
      'freighter',
      new Vector3(0, 0, 300),
      escapeZonePosition,
      200,
      0,
      10,
    );

    // Spawn 10 enemies
    const enemies = [];
    for (let i = 0; i < 10; i++) {
      const entity = spawnEscortEnemy(world, escortData, escapeZonePosition);
      if (entity) enemies.push(entity);
    }

    // All should be convoy-hunter
    let convoyHunterCount = 0;
    for (const entity of enemies) {
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai?.behaviorMode === 'convoy-hunter') {
        convoyHunterCount++;
      }
    }

    assert.strictEqual(
      convoyHunterCount,
      enemies.length,
      'All enemies should be convoy-hunter when ratio is 0',
    );
  });

  it('assigns standard to all enemies when ratio is 1', () => {
    const world = createWorld(12345);
    const escortData = createTestEscortData(1);
    const escapeZonePosition = new Vector3(0, 0, 5000);

    // Spawn convoy ships
    createConvoyShipEntity(
      world,
      'freighter',
      new Vector3(0, 0, 300),
      escapeZonePosition,
      200,
      0,
      10,
    );

    // Spawn 10 enemies
    const enemies = [];
    for (let i = 0; i < 10; i++) {
      const entity = spawnEscortEnemy(world, escortData, escapeZonePosition);
      if (entity) enemies.push(entity);
    }

    // All should be standard
    let standardCount = 0;
    for (const entity of enemies) {
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai?.behaviorMode === 'standard') {
        standardCount++;
      }
    }

    assert.strictEqual(
      standardCount,
      enemies.length,
      'All enemies should be standard when ratio is 1',
    );
  });

  it('splits modes approximately when ratio is 0.5', () => {
    const world = createWorld(12345);
    const escortData = createTestEscortData(0.5);
    const escapeZonePosition = new Vector3(0, 0, 5000);

    // Spawn convoy ships
    createConvoyShipEntity(
      world,
      'freighter',
      new Vector3(0, 0, 300),
      escapeZonePosition,
      200,
      0,
      10,
    );

    // Spawn 100 enemies for statistical significance
    const enemies = [];
    for (let i = 0; i < 100; i++) {
      const entity = spawnEscortEnemy(world, escortData, escapeZonePosition);
      if (entity) enemies.push(entity);
    }

    let standardCount = 0;
    for (const entity of enemies) {
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai?.behaviorMode === 'standard') {
        standardCount++;
      }
    }

    const ratio = standardCount / enemies.length;
    assert.ok(
      ratio >= 0.35 && ratio <= 0.65,
      `Expected 35-65% standard, got ${(ratio * 100).toFixed(1)}%`,
    );
  });

  it('is deterministic with same PRNG seed', () => {
    const escortData = createTestEscortData(0.5);
    const escapeZonePosition = new Vector3(0, 0, 5000);

    // First run
    const world1 = createWorld(99999);
    createConvoyShipEntity(
      world1,
      'freighter',
      new Vector3(0, 0, 300),
      escapeZonePosition,
      200,
      0,
      10,
    );
    const modes1 = [];
    for (let i = 0; i < 20; i++) {
      const entity = spawnEscortEnemy(world1, escortData, escapeZonePosition);
      if (entity) {
        const ai = getComponent(world1, entity, 'aiControlled');
        modes1.push(ai?.behaviorMode);
      }
    }

    // Second run with same seed
    const world2 = createWorld(99999);
    createConvoyShipEntity(
      world2,
      'freighter',
      new Vector3(0, 0, 300),
      escapeZonePosition,
      200,
      0,
      10,
    );
    const modes2 = [];
    for (let i = 0; i < 20; i++) {
      const entity = spawnEscortEnemy(world2, escortData, escapeZonePosition);
      if (entity) {
        const ai = getComponent(world2, entity, 'aiControlled');
        modes2.push(ai?.behaviorMode);
      }
    }

    assert.deepStrictEqual(
      modes1,
      modes2,
      'Same seed should produce identical mode assignments',
    );
  });
});

describe('playerThreatRatio for station defense', () => {
  /** Create enemy ships without behavior mode set */
  function createUnassignedEnemies(world, count) {
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const pos = new Vector3(500 + i * 50, 0, -1000);
      const rot = new Quaternion();
      const entity = createEnemyShip(world, 'fighter', pos, rot, 'regular');
      // Clear behavior mode (it may default from archetype)
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai) {
        ai.behaviorMode = undefined;
      }
      enemies.push(entity);
    }
    return enemies;
  }

  it('assigns station-hunter to all enemies when ratio is 0', () => {
    const world = createWorld(12345);
    const enemies = createUnassignedEnemies(world, 10);

    setEnemiesToStationHunter(world, 0);

    let stationHunterCount = 0;
    for (const entity of enemies) {
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai?.behaviorMode === 'station-hunter') {
        stationHunterCount++;
      }
    }

    assert.strictEqual(
      stationHunterCount,
      enemies.length,
      'All enemies should be station-hunter when ratio is 0',
    );
  });

  it('assigns standard to all enemies when ratio is 1', () => {
    const world = createWorld(12345);
    const enemies = createUnassignedEnemies(world, 10);

    setEnemiesToStationHunter(world, 1);

    let standardCount = 0;
    for (const entity of enemies) {
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai?.behaviorMode === 'standard') {
        standardCount++;
      }
    }

    assert.strictEqual(
      standardCount,
      enemies.length,
      'All enemies should be standard when ratio is 1',
    );
  });

  it('splits modes approximately when ratio is 0.5', () => {
    const world = createWorld(12345);
    const enemies = createUnassignedEnemies(world, 100);

    setEnemiesToStationHunter(world, 0.5);

    let standardCount = 0;
    for (const entity of enemies) {
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai?.behaviorMode === 'standard') {
        standardCount++;
      }
    }

    const ratio = standardCount / enemies.length;
    assert.ok(
      ratio >= 0.35 && ratio <= 0.65,
      `Expected 35-65% standard, got ${(ratio * 100).toFixed(1)}%`,
    );
  });

  it('preserves existing behavior modes', () => {
    const world = createWorld(12345);

    // Create enemies with pre-set behavior modes
    const enemies = [];
    for (let i = 0; i < 5; i++) {
      const pos = new Vector3(500 + i * 50, 0, -1000);
      const rot = new Quaternion();
      const entity = createEnemyShip(world, 'fighter', pos, rot, 'regular');
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai) {
        // Pre-set to a specific mode
        ai.behaviorMode = 'standard';
      }
      enemies.push(entity);
    }

    // Call setEnemiesToStationHunter - should NOT override existing modes
    setEnemiesToStationHunter(world, 0);

    // All should still be 'standard' (not overwritten to station-hunter)
    let standardCount = 0;
    for (const entity of enemies) {
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai?.behaviorMode === 'standard') {
        standardCount++;
      }
    }

    assert.strictEqual(
      standardCount,
      enemies.length,
      'Existing behavior modes should be preserved',
    );
  });

  it('is deterministic with same PRNG seed', () => {
    // First run
    const world1 = createWorld(99999);
    createUnassignedEnemies(world1, 20);
    setEnemiesToStationHunter(world1, 0.5);

    const modes1 = [];
    for (const entity of world1.entities) {
      const ai = getComponent(world1, entity, 'aiControlled');
      if (ai?.behaviorMode) {
        modes1.push(ai.behaviorMode);
      }
    }

    // Second run with same seed
    const world2 = createWorld(99999);
    createUnassignedEnemies(world2, 20);
    setEnemiesToStationHunter(world2, 0.5);

    const modes2 = [];
    for (const entity of world2.entities) {
      const ai = getComponent(world2, entity, 'aiControlled');
      if (ai?.behaviorMode) {
        modes2.push(ai.behaviorMode);
      }
    }

    assert.deepStrictEqual(
      modes1,
      modes2,
      'Same seed should produce identical mode assignments',
    );
  });
});
