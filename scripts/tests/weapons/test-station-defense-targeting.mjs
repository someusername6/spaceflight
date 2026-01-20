/**
 * Station Defense Targeting Tests - Enemies attacking Player stations.
 * Also includes faction relationship tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { areEnemies, Faction } from '../../../src/components/faction.ts';
import { MISSILES } from '../../../src/data/missiles.ts';
import {
  calculateDamage,
  createTestWorld,
  getTotalHealth,
  runForTicks,
} from '../shared/weapon-damage-utils.mjs';
import {
  createEnemyWithWeapons,
  createTestStation,
  spawnFlakProjectile,
  spawnTestMissile,
} from './convoy-station-test-helpers.mjs';

describe('Station Defense - Enemy Missiles vs Player Station', () => {
  it('tracking missile hits and damages player station (direct hit)', () => {
    const world = createTestWorld();

    const enemy = createEnemyWithWeapons(world, new Vector3(0, 0, 600));
    const station = createTestStation(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, station);

    const direction = new Vector3(0, 0, -1);
    spawnTestMissile(
      world,
      'torpedo',
      new Vector3(0, 0, 400),
      direction,
      enemy,
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
    }

    assert.ok(hitDetected, 'Tracking missile should damage player station');
  });

  it('nuke missile damages player station via proximity detonation', () => {
    const world = createTestWorld();

    const enemy = createEnemyWithWeapons(world, new Vector3(0, 0, 600));
    const station = createTestStation(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, station);

    const stats = MISSILES.nuke;
    const direction = new Vector3(0, 0, -1);
    // Fire nuke offset so it passes nearby
    spawnTestMissile(
      world,
      'nuke',
      new Vector3(stats.aoeRadius * 0.5, 0, 400),
      direction,
      enemy,
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
    }

    assert.ok(
      hitDetected,
      'Nuke should damage player station via proximity detonation',
    );
  });

  it('flak projectile detonates near player station and damages it', () => {
    const world = createTestWorld();

    const enemy = createEnemyWithWeapons(world, new Vector3(0, 0, 500));
    const station = createTestStation(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, station);

    // Station has large collision radius (~340m), place flak just outside
    const direction = new Vector3(0, 0, -1);
    spawnFlakProjectile(world, new Vector3(0, 0, 400), direction, enemy);

    let hitDetected = false;
    for (let tick = 0; tick < 300; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, station);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }
    }

    assert.ok(hitDetected, 'Flak should damage player station');
  });

  it('starburst missile detonates near player station and damages it', () => {
    const world = createTestWorld();

    const enemy = createEnemyWithWeapons(world, new Vector3(0, 0, 600));
    const station = createTestStation(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, station);

    const direction = new Vector3(0, 0, -1);
    spawnTestMissile(
      world,
      'starburst',
      new Vector3(50, 0, 400),
      direction,
      enemy,
      station,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 300; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, station);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }
    }

    assert.ok(hitDetected, 'Starburst should damage player station');
  });
});

describe('Faction Relationships for Targeting', () => {
  it('areEnemies(Enemy, Player) returns true', () => {
    assert.strictEqual(
      areEnemies(Faction.Enemy, Faction.Player),
      true,
      'Enemy and Player should be enemies',
    );
  });

  it('areEnemies(Player, Enemy) returns true', () => {
    assert.strictEqual(
      areEnemies(Faction.Player, Faction.Enemy),
      true,
      'Player and Enemy should be enemies',
    );
  });
});
