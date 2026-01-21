/**
 * Tests for AI Station Defender Behavior
 *
 * Tests the findStationAttacker function which provides smart target
 * distribution for enemy defenders in attack-station missions.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createAIControlled } from '../../../src/components/ai.ts';
import { createFaction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createStructure } from '../../../src/components/structure.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { DEFAULT_TEST_PROFILE } from '../../../src/data/test-fixtures.ts';
import {
  findEnemyStation,
  findStationAttacker,
} from '../../../src/systems/ai/ai-utils.ts';

/** Create an enemy station at a position */
function createEnemyStation(world, x, y, z) {
  const entity = createEntity(world);
  addComponent(world, entity, createTransform(x, y, z));
  addComponent(world, entity, createHealth(10000, 10000));
  addComponent(world, entity, createFaction(Faction.Enemy));
  addComponent(world, entity, createStructure('station'));
  return entity;
}

/** Create an enemy defender at a position */
function createDefender(world, x, y, z, target = null) {
  const entity = createEntity(world);
  addComponent(world, entity, createTransform(x, y, z));
  addComponent(world, entity, createHealth(100, 100));
  addComponent(world, entity, createFaction(Faction.Enemy));
  const ai = createAIControlled(DEFAULT_TEST_PROFILE, 600);
  ai.target = target;
  ai.behaviorMode = 'station-defender';
  addComponent(world, entity, ai);
  return entity;
}

/** Create a player ship at a position, optionally targeting something */
function createPlayerShip(world, x, y, z, target = null) {
  const entity = createEntity(world);
  addComponent(world, entity, createTransform(x, y, z));
  addComponent(world, entity, createHealth(100, 100));
  addComponent(world, entity, createFaction(Faction.Player));
  const ai = createAIControlled(DEFAULT_TEST_PROFILE, 600);
  ai.target = target;
  ai.behaviorMode = 'station-assault-high-dps';
  addComponent(world, entity, ai);
  return entity;
}

describe('findEnemyStation', () => {
  it('finds enemy faction station', () => {
    const world = createWorld(12345);
    const station = createEnemyStation(world, 0, 0, -3000);

    const found = findEnemyStation(world);

    assert.strictEqual(found, station, 'Should find enemy station');
  });

  it('returns null when no station exists', () => {
    const world = createWorld(12345);
    // Only create a defender, no station
    createDefender(world, 0, 0, 0);

    const found = findEnemyStation(world);

    assert.strictEqual(found, null, 'Should return null with no station');
  });

  it('skips dead stations', () => {
    const world = createWorld(12345);
    const station = createEnemyStation(world, 0, 0, -3000);
    // Kill the station
    const health = getComponent(world, station, 'health');
    health.hull = 0;

    const found = findEnemyStation(world);

    assert.strictEqual(found, null, 'Should skip dead stations');
  });
});

describe('findStationAttacker', () => {
  it('prioritizes enemies targeting the station', () => {
    const world = createWorld(12345);
    const station = createEnemyStation(world, 0, 0, -3000);
    const defender = createDefender(world, 0, 0, -2800);

    // Player ship targeting station (priority)
    const attacker = createPlayerShip(world, 0, 0, -1000, station);
    // Player ship not targeting station (lower priority)
    createPlayerShip(world, 100, 0, -1000, null);

    const target = findStationAttacker(world, defender, Faction.Enemy, station);

    assert.strictEqual(
      target,
      attacker,
      'Should prioritize ship attacking station',
    );
  });

  it('distributes defenders across multiple attackers', () => {
    const world = createWorld(12345);
    const station = createEnemyStation(world, 0, 0, -3000);

    // Two attackers targeting station
    const attacker1 = createPlayerShip(world, 0, 0, -1000, station);
    const attacker2 = createPlayerShip(world, 100, 0, -1000, station);

    // First defender - both attackers have 0 defenders
    const defender1 = createDefender(world, 0, 0, -2800);
    const target1 = findStationAttacker(
      world,
      defender1,
      Faction.Enemy,
      station,
    );
    // Should pick either attacker (both have 0 defenders)
    assert.ok(
      target1 === attacker1 || target1 === attacker2,
      'First defender should target an attacker',
    );

    // Simulate defender1 now targeting attacker1
    const ai1 = getComponent(world, defender1, 'aiControlled');
    ai1.target = attacker1;

    // Second defender - attacker1 has 1 defender, attacker2 has 0
    const defender2 = createDefender(world, 50, 0, -2800);
    const target2 = findStationAttacker(
      world,
      defender2,
      Faction.Enemy,
      station,
    );

    assert.strictEqual(
      target2,
      attacker2,
      'Second defender should target the attacker with fewer defenders',
    );
  });

  it('falls back to non-attackers when no station attackers exist', () => {
    const world = createWorld(12345);
    const station = createEnemyStation(world, 0, 0, -3000);
    const defender = createDefender(world, 0, 0, -2800);

    // Player ship NOT targeting station
    const player = createPlayerShip(world, 0, 0, 0, null);

    const target = findStationAttacker(world, defender, Faction.Enemy, station);

    assert.strictEqual(
      target,
      player,
      'Should fall back to non-attacker when no attackers exist',
    );
  });

  it('returns null when no enemies exist', () => {
    const world = createWorld(12345);
    const station = createEnemyStation(world, 0, 0, -3000);
    const defender = createDefender(world, 0, 0, -2800);

    const target = findStationAttacker(world, defender, Faction.Enemy, station);

    assert.strictEqual(target, null, 'Should return null with no enemies');
  });

  it('skips dead enemies', () => {
    const world = createWorld(12345);
    const station = createEnemyStation(world, 0, 0, -3000);
    const defender = createDefender(world, 0, 0, -2800);

    // Dead attacker
    const deadAttacker = createPlayerShip(world, 0, 0, -1000, station);
    const deadHealth = getComponent(world, deadAttacker, 'health');
    deadHealth.hull = 0;

    // Living attacker
    const livingAttacker = createPlayerShip(world, 100, 0, -1000, station);

    const target = findStationAttacker(world, defender, Faction.Enemy, station);

    assert.strictEqual(target, livingAttacker, 'Should skip dead enemies');
  });

  it('returns null when station is null', () => {
    const world = createWorld(12345);
    const defender = createDefender(world, 0, 0, -2800);
    createPlayerShip(world, 0, 0, -1000, null);

    const target = findStationAttacker(world, defender, Faction.Enemy, null);

    assert.strictEqual(target, null, 'Should return null when station is null');
  });
});
