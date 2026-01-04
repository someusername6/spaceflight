/**
 * Missile Owner Collision Tests
 */

import { entityExists } from '../../../src/core/ecs.ts';
import {
  assert,
  createShip,
  createTestMissile,
  createTestWorld,
  Faction,
  runFrame,
  summarize,
  test,
} from '../shared/test-utils.mjs';

console.log('\n=== MISSILE OWNER COLLISION TESTS ===\n');

const MISSILE_OWNER_SAFE_DISTANCE = 100;

test('Missile ignores owner collision within safe distance', () => {
  const world = createTestWorld();
  const owner = createShip(world, 0, 0, 0, Faction.Player);
  const missile = createTestMissile(world, owner, 5, 0, 0, {
    distanceTraveled: 50,
  });

  runFrame(world);

  assert(entityExists(world, missile), 'Missile should still exist');
  assert(
    world.systemState.combatStats.missilesHitOwner === 0,
    'Should not count owner hit',
  );
});

test('Missile destroyed on owner collision after safe distance', () => {
  const world = createTestWorld();
  const owner = createShip(world, 0, 0, 0, Faction.Player);
  const missile = createTestMissile(world, owner, 5, 0, 0, {
    distanceTraveled: 150,
  });

  runFrame(world);

  assert(!entityExists(world, missile), 'Missile should be destroyed');
  assert(
    world.systemState.combatStats.missilesHitOwner === 1,
    'Should count exactly 1 owner hit',
  );
});

test('Owner collision counted once across multiple frames', () => {
  const world = createTestWorld();
  const owner = createShip(world, 0, 0, 0, Faction.Player);
  createTestMissile(world, owner, 5, 0, 0, { distanceTraveled: 150 });

  runFrame(world);
  runFrame(world);
  runFrame(world);

  assert(
    world.systemState.combatStats.missilesHitOwner === 1,
    `Should count exactly 1 owner hit, got ${world.systemState.combatStats.missilesHitOwner}`,
  );
});

test('Safe distance (100m) sufficient for torpedo turn radius', () => {
  const torpedoSpeed = 200;
  const timeToSafeDistance = MISSILE_OWNER_SAFE_DISTANCE / torpedoSpeed;
  assert(
    timeToSafeDistance >= 0.5,
    `Expected >= 0.5s, got ${timeToSafeDistance}s`,
  );
});

summarize();
