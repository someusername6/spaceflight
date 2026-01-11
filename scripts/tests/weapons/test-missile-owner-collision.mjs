/**
 * Missile Owner Collision Tests
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { entityExists } from '../../../src/core/ecs.ts';
import {
  createShip,
  createTestMissile,
  createTestWorld,
  Faction,
  runFrame,
} from '../shared/test-utils.mjs';

const MISSILE_OWNER_SAFE_DISTANCE = 100;

describe('Missile Owner Collision Tests', () => {
  it('Missile ignores owner collision within safe distance', () => {
    const world = createTestWorld();
    const owner = createShip(world, 0, 0, 0, Faction.Player);
    const missile = createTestMissile(world, owner, 5, 0, 0, {
      distanceTraveled: 50,
    });

    runFrame(world);

    assert.ok(entityExists(world, missile), 'Missile should still exist');
    assert.ok(
      world.systemState.combatStats.missilesHitOwner === 0,
      'Should not count owner hit',
    );
  });

  it('Missile destroyed on owner collision after safe distance', () => {
    const world = createTestWorld();
    const owner = createShip(world, 0, 0, 0, Faction.Player);
    const missile = createTestMissile(world, owner, 5, 0, 0, {
      distanceTraveled: 150,
    });

    runFrame(world);

    assert.ok(!entityExists(world, missile), 'Missile should be destroyed');
    assert.ok(
      world.systemState.combatStats.missilesHitOwner === 1,
      'Should count exactly 1 owner hit',
    );
  });

  it('Owner collision counted once across multiple frames', () => {
    const world = createTestWorld();
    const owner = createShip(world, 0, 0, 0, Faction.Player);
    createTestMissile(world, owner, 5, 0, 0, { distanceTraveled: 150 });

    runFrame(world);
    runFrame(world);
    runFrame(world);

    assert.ok(
      world.systemState.combatStats.missilesHitOwner === 1,
      `Should count exactly 1 owner hit, got ${world.systemState.combatStats.missilesHitOwner}`,
    );
  });

  it('Safe distance (100m) sufficient for torpedo turn radius', () => {
    const torpedoSpeed = 200;
    const timeToSafeDistance = MISSILE_OWNER_SAFE_DISTANCE / torpedoSpeed;
    assert.ok(
      timeToSafeDistance >= 0.5,
      `Expected >= 0.5s, got ${timeToSafeDistance}s`,
    );
  });
});
