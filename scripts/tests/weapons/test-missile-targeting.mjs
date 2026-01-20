/**
 * Missile Targeting Tests - Verify targeting and damage priority.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { createFaction, Faction } from '../../../src/components/faction.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  getComponent,
} from '../../../src/core/ecs.ts';
import {
  calculateDamage,
  countMissiles,
  createEnemyConvoy,
  createEnemyStation,
  createSimpleTarget,
  createTestWorld,
  getTotalHealth,
  runForTicks,
} from '../shared/weapon-damage-utils.mjs';
import { spawnMissile } from './missile-test-helpers.mjs';

// ============================================================================
// Tests: Damage Priority (Shields before Hull)
// ============================================================================

describe('Missile Damage Priority - Shields Before Hull', () => {
  it('seeker damages shields before hull', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createSimpleTarget(
      world,
      new Vector3(0, 0, 0),
      200,
      100,
      15,
    );
    const before = getTotalHealth(world, target);

    assert.ok(before.shields > 0, 'Target should have shields');

    const direction = new Vector3(0, 0, -1);
    spawnMissile(
      world,
      'seeker',
      new Vector3(0, 0, 30),
      direction,
      owner,
      target,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 120; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);

      if (damage.totalDamage > 0) {
        hitDetected = true;
        assert.ok(
          damage.shieldDamage > 0,
          `Damage should go to shields first (shield: ${damage.shieldDamage}, hull: ${damage.hullDamage})`,
        );
        break;
      }

      if (countMissiles(world) === 0 && tick > 10) {
        break;
      }
    }

    assert.ok(hitDetected, 'Seeker should have hit target');
  });
});

// ============================================================================
// Tests: Targeting - Enemy Convoys and Stations
// ============================================================================

describe('Targeting - Enemy Convoys and Stations', () => {
  it('enemy convoy appears in valid targets', () => {
    const world = createTestWorld();

    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 100));
    addComponent(world, player, createFaction(Faction.Player));

    const convoy = createEnemyConvoy(world, new Vector3(0, 0, 0));

    const convoyFaction = getComponent(world, convoy, 'faction');
    const convoyIdentity = getComponent(world, convoy, 'shipIdentity');
    const convoyHealth = getComponent(world, convoy, 'health');

    assert.ok(convoyFaction, 'Convoy should have faction component');
    assert.strictEqual(
      convoyFaction.faction,
      Faction.Enemy,
      'Convoy should be enemy faction',
    );
    assert.ok(
      convoyIdentity,
      'Convoy should have shipIdentity component for targeting',
    );
    assert.ok(convoyHealth, 'Convoy should have health component');
  });

  it('enemy station appears in valid targets', () => {
    const world = createTestWorld();

    const player = createEntity(world);
    addComponent(world, player, createTransform(0, 0, 100));
    addComponent(world, player, createFaction(Faction.Player));

    const station = createEnemyStation(world, new Vector3(0, 0, 0));

    const stationFaction = getComponent(world, station, 'faction');
    const stationIdentity = getComponent(world, station, 'shipIdentity');
    const stationHealth = getComponent(world, station, 'health');

    assert.ok(stationFaction, 'Station should have faction component');
    assert.strictEqual(
      stationFaction.faction,
      Faction.Enemy,
      'Station should be enemy faction',
    );
    assert.ok(
      stationIdentity,
      'Station should have shipIdentity component for targeting',
    );
    assert.ok(stationHealth, 'Station should have health component');
  });

  it('tracking missile follows and hits enemy convoy', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const convoy = createEnemyConvoy(world, new Vector3(50, 0, 0));
    const before = getTotalHealth(world, convoy);

    const direction = new Vector3(0, 0, -1);
    spawnMissile(
      world,
      'seeker',
      new Vector3(0, 0, 150),
      direction,
      owner,
      convoy,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 600; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, convoy);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }

      if (countMissiles(world) === 0 && tick > 30) {
        break;
      }
    }

    assert.ok(hitDetected, 'Seeker should track and hit enemy convoy');
  });

  it('tracking missile follows and hits enemy station', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const station = createEnemyStation(world, new Vector3(50, 0, 0));
    const before = getTotalHealth(world, station);

    const direction = new Vector3(0, 0, -1);
    spawnMissile(
      world,
      'seeker',
      new Vector3(0, 0, 150),
      direction,
      owner,
      station,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 600; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, station);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }

      if (countMissiles(world) === 0 && tick > 30) {
        break;
      }
    }

    assert.ok(hitDetected, 'Seeker should track and hit enemy station');
  });
});
