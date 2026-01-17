/**
 * Tests for AI Behavior Modes (convoy-hunter, defensive)
 *
 * Verifies the new targeting functions work correctly for escort missions.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createAIControlled } from '../../../src/components/ai.ts';
import { createConvoyShip } from '../../../src/components/convoy.ts';
import { createFaction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { DEFAULT_TEST_PROFILE } from '../../../src/data/test-fixtures.ts';
import {
  findNearestConvoyShip,
  findNearestThreatToConvoy,
  getConvoyCentroid,
} from '../../../src/systems/ai/ai-utils.ts';

/** Create a convoy ship at a position */
function createConvoyEntity(world, x, y, z, index = 0, health = 100) {
  const entity = createEntity(world);
  addComponent(world, entity, createTransform(x, y, z));
  addComponent(world, entity, createHealth(100, health));
  addComponent(world, entity, createConvoyShip(index));
  addComponent(world, entity, createFaction(Faction.Neutral));
  return entity;
}

/** Create an enemy ship at a position */
function createEnemyEntity(world, x, y, z, health = 100) {
  const entity = createEntity(world);
  addComponent(world, entity, createTransform(x, y, z));
  addComponent(world, entity, createHealth(100, health));
  addComponent(world, entity, createFaction(Faction.Enemy));
  addComponent(world, entity, createAIControlled(DEFAULT_TEST_PROFILE, 600));
  return entity;
}

/** Create a friendly (player faction) ship at a position */
function createFriendlyEntity(world, x, y, z) {
  const entity = createEntity(world);
  addComponent(world, entity, createTransform(x, y, z));
  addComponent(world, entity, createHealth(100, 100));
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createAIControlled(DEFAULT_TEST_PROFILE, 600));
  return entity;
}

describe('findNearestConvoyShip', () => {
  it('returns nearest living convoy ship', () => {
    const world = createWorld(12345);
    const self = createEnemyEntity(world, 0, 0, 0);

    // Create convoy ships at different distances
    createConvoyEntity(world, 500, 0, 0, 0); // far convoy
    const nearConvoy = createConvoyEntity(world, 100, 0, 0, 1);
    createConvoyEntity(world, 300, 0, 0, 2); // mid convoy

    const target = findNearestConvoyShip(world, self);

    assert.strictEqual(target, nearConvoy, 'Should return nearest convoy ship');
  });

  it('returns null when no convoy ships exist', () => {
    const world = createWorld(12345);
    const self = createEnemyEntity(world, 0, 0, 0);

    // No convoy ships, only enemies
    createEnemyEntity(world, 100, 0, 0);

    const target = findNearestConvoyShip(world, self);

    assert.strictEqual(target, null, 'Should return null with no convoy');
  });

  it('skips dead convoy ships', () => {
    const world = createWorld(12345);
    const self = createEnemyEntity(world, 0, 0, 0);

    // Dead convoy ship closer
    const deadConvoy = createConvoyEntity(world, 50, 0, 0, 0, 0);
    // Living convoy ship farther
    const livingConvoy = createConvoyEntity(world, 200, 0, 0, 1, 100);

    const target = findNearestConvoyShip(world, self);

    assert.strictEqual(target, livingConvoy, 'Should skip dead convoy');
    assert.notStrictEqual(target, deadConvoy, 'Should not return dead convoy');
  });

  it('returns null when all convoy ships are dead', () => {
    const world = createWorld(12345);
    const self = createEnemyEntity(world, 0, 0, 0);

    // All dead convoy ships
    createConvoyEntity(world, 100, 0, 0, 0, 0);
    createConvoyEntity(world, 200, 0, 0, 1, 0);

    const target = findNearestConvoyShip(world, self);

    assert.strictEqual(target, null, 'Should return null when all convoy dead');
  });
});

describe('getConvoyCentroid', () => {
  it('returns center of convoy ships', () => {
    const world = createWorld(12345);

    // Triangle of convoy ships
    createConvoyEntity(world, 0, 0, 0, 0);
    createConvoyEntity(world, 300, 0, 0, 1);
    createConvoyEntity(world, 150, 0, 300, 2);

    const centroid = getConvoyCentroid(world);

    assert.ok(centroid, 'Should return centroid');
    assert.strictEqual(centroid.x, 150, 'X should be average');
    assert.strictEqual(centroid.y, 0, 'Y should be average');
    assert.strictEqual(centroid.z, 100, 'Z should be average');
  });

  it('skips dead convoy ships in calculation', () => {
    const world = createWorld(12345);

    // One living, one dead
    createConvoyEntity(world, 0, 0, 0, 0, 100); // living at origin
    createConvoyEntity(world, 1000, 0, 0, 1, 0); // dead far away

    const centroid = getConvoyCentroid(world);

    assert.ok(centroid, 'Should return centroid');
    assert.strictEqual(centroid.x, 0, 'Should only consider living ship');
    assert.strictEqual(centroid.z, 0, 'Should only consider living ship');
  });

  it('returns null when all convoy dead', () => {
    const world = createWorld(12345);

    createConvoyEntity(world, 0, 0, 0, 0, 0);
    createConvoyEntity(world, 100, 0, 0, 1, 0);

    const centroid = getConvoyCentroid(world);

    assert.strictEqual(centroid, null, 'Should return null when all dead');
  });

  it('returns null when no convoy exists', () => {
    const world = createWorld(12345);

    const centroid = getConvoyCentroid(world);

    assert.strictEqual(centroid, null, 'Should return null with no convoy');
  });
});

describe('findNearestThreatToConvoy', () => {
  it('returns enemy near convoy', () => {
    const world = createWorld(12345);

    // Convoy at origin
    createConvoyEntity(world, 0, 0, 0, 0);

    // Friendly wingman doing the search
    const self = createFriendlyEntity(world, 100, 0, 0);

    // Enemy near convoy (within 800m defensive range)
    const nearEnemy = createEnemyEntity(world, 200, 0, 0);

    const centroid = getConvoyCentroid(world);
    const target = findNearestThreatToConvoy(
      world,
      self,
      Faction.Player,
      centroid,
    );

    assert.strictEqual(target, nearEnemy, 'Should find enemy near convoy');
  });

  it('skips enemies beyond defensive range (800m)', () => {
    const world = createWorld(12345);

    // Convoy at origin
    createConvoyEntity(world, 0, 0, 0, 0);

    // Friendly wingman
    const self = createFriendlyEntity(world, 100, 0, 0);

    // Enemy far from convoy (beyond 800m)
    createEnemyEntity(world, 1500, 0, 0);

    const centroid = getConvoyCentroid(world);
    const target = findNearestThreatToConvoy(
      world,
      self,
      Faction.Player,
      centroid,
    );

    assert.strictEqual(target, null, 'Should ignore enemies beyond 800m');
  });

  it('returns nearest of multiple threats', () => {
    const world = createWorld(12345);

    // Convoy at origin
    createConvoyEntity(world, 0, 0, 0, 0);

    // Friendly wingman
    const self = createFriendlyEntity(world, 50, 0, 0);

    // Multiple enemies at different distances from convoy
    createEnemyEntity(world, 600, 0, 0); // far enemy
    const nearEnemy = createEnemyEntity(world, 200, 0, 0);
    createEnemyEntity(world, 400, 0, 0); // mid enemy

    const centroid = getConvoyCentroid(world);
    const target = findNearestThreatToConvoy(
      world,
      self,
      Faction.Player,
      centroid,
    );

    assert.strictEqual(
      target,
      nearEnemy,
      'Should return nearest threat to convoy',
    );
  });

  it('skips dead enemies', () => {
    const world = createWorld(12345);

    // Convoy at origin
    createConvoyEntity(world, 0, 0, 0, 0);

    // Friendly wingman
    const self = createFriendlyEntity(world, 50, 0, 0);

    // Dead enemy closer
    createEnemyEntity(world, 100, 0, 0, 0);
    // Living enemy farther
    const livingEnemy = createEnemyEntity(world, 300, 0, 0, 100);

    const centroid = getConvoyCentroid(world);
    const target = findNearestThreatToConvoy(
      world,
      self,
      Faction.Player,
      centroid,
    );

    assert.strictEqual(target, livingEnemy, 'Should skip dead enemies');
  });

  it('returns null when no convoy exists', () => {
    const world = createWorld(12345);

    const self = createFriendlyEntity(world, 0, 0, 0);
    createEnemyEntity(world, 100, 0, 0);

    const centroid = getConvoyCentroid(world);
    const target = findNearestThreatToConvoy(
      world,
      self,
      Faction.Player,
      centroid,
    );

    assert.strictEqual(target, null, 'Should return null with no convoy');
  });
});
