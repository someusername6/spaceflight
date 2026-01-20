/**
 * Ambush Mission Targeting Tests - Player attacking Enemy convoys.
 * In ambush missions, convoys use Enemy faction so player can target them.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { Faction } from '../../../src/components/faction.ts';
import { MISSILES } from '../../../src/data/missiles.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import {
  calculateDamage,
  createTestWorld,
  getTotalHealth,
  runForTicks,
} from '../shared/weapon-damage-utils.mjs';
import {
  createPlayerWithWeapons,
  createTestConvoy,
  spawnFlakProjectile,
  spawnTestMissile,
} from './convoy-station-test-helpers.mjs';

describe('Ambush Mission - Player Missiles vs Enemy Convoy', () => {
  it('tracking missile hits and damages enemy convoy (direct hit)', () => {
    const world = createTestWorld();

    const player = createPlayerWithWeapons(world, new Vector3(0, 0, 100));
    const convoy = createTestConvoy(world, new Vector3(0, 0, 0), Faction.Enemy);
    const before = getTotalHealth(world, convoy);

    const direction = new Vector3(0, 0, -1);
    spawnTestMissile(
      world,
      'seeker',
      new Vector3(0, 0, 50),
      direction,
      player,
      convoy,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 300; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, convoy);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }
    }

    assert.ok(hitDetected, 'Tracking missile should damage enemy convoy');
  });

  it('nuke missile damages enemy convoy via proximity detonation', () => {
    const world = createTestWorld();

    const player = createPlayerWithWeapons(world, new Vector3(0, 0, 200));
    const convoy = createTestConvoy(world, new Vector3(0, 0, 0), Faction.Enemy);
    const before = getTotalHealth(world, convoy);

    const stats = MISSILES.nuke;
    const offsetX = stats.aoeRadius * 0.5;
    const direction = new Vector3(0, 0, -1);
    spawnTestMissile(
      world,
      'nuke',
      new Vector3(offsetX, 0, stats.aoeRadius + 50),
      direction,
      player,
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
    }

    assert.ok(
      hitDetected,
      'Nuke should damage enemy convoy via proximity detonation',
    );
  });

  it('flak projectile detonates near enemy convoy and damages it', () => {
    const world = createTestWorld();

    const player = createPlayerWithWeapons(world, new Vector3(0, 0, 200));
    const convoy = createTestConvoy(world, new Vector3(0, 0, 0), Faction.Enemy);
    const before = getTotalHealth(world, convoy);

    const weapon = PRIMARY_WEAPONS.flak;
    const direction = new Vector3(0, 0, -1);
    spawnFlakProjectile(
      world,
      new Vector3(0, 0, weapon.flakRadius + 10),
      direction,
      player,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 300; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, convoy);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }
    }

    assert.ok(hitDetected, 'Flak should damage enemy convoy');
  });

  it('starburst missile detonates near enemy convoy and damages it', () => {
    const world = createTestWorld();

    const player = createPlayerWithWeapons(world, new Vector3(0, 0, 200));
    const convoy = createTestConvoy(world, new Vector3(0, 0, 0), Faction.Enemy);
    const before = getTotalHealth(world, convoy);

    const stats = MISSILES.starburst;
    const direction = new Vector3(0, 0, -1);
    spawnTestMissile(
      world,
      'starburst',
      new Vector3(30, 0, stats.flakRadius + 50),
      direction,
      player,
      convoy,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 300; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, convoy);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }
    }

    assert.ok(hitDetected, 'Starburst should damage enemy convoy');
  });
});
