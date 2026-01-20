/**
 * Escort Mission Targeting Tests - Enemies attacking Player convoys.
 * In escort missions, convoys use Player faction so enemies can target them.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { Faction } from '../../../src/components/faction.ts';
import { MISSILES } from '../../../src/data/missiles.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import {
  calculateDamage,
  countProjectiles,
  createTestWorld,
  getTotalHealth,
  runForTicks,
} from '../shared/weapon-damage-utils.mjs';
import {
  createEnemyWithWeapons,
  createTestConvoy,
  spawnFlakProjectile,
  spawnTestMissile,
} from './convoy-station-test-helpers.mjs';

describe('Escort Mission - Enemy Missiles vs Player Convoy', () => {
  it('tracking missile hits and damages player convoy (direct hit)', () => {
    const world = createTestWorld();

    const enemy = createEnemyWithWeapons(world, new Vector3(0, 0, 100));
    const convoy = createTestConvoy(
      world,
      new Vector3(0, 0, 0),
      Faction.Player,
    );
    const before = getTotalHealth(world, convoy);

    // Spawn tracking missile at convoy
    const direction = new Vector3(0, 0, -1);
    spawnTestMissile(
      world,
      'seeker',
      new Vector3(0, 0, 50),
      direction,
      enemy,
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

    assert.ok(
      hitDetected,
      'Tracking missile should damage player convoy on direct hit',
    );
  });

  it('nuke missile damages player convoy via proximity detonation', () => {
    const world = createTestWorld();

    const enemy = createEnemyWithWeapons(world, new Vector3(0, 0, 200));
    const convoy = createTestConvoy(
      world,
      new Vector3(0, 0, 0),
      Faction.Player,
    );
    const before = getTotalHealth(world, convoy);

    // Spawn nuke missile passing near convoy (not direct hit)
    const stats = MISSILES.nuke;
    const offsetX = stats.aoeRadius * 0.5;
    const direction = new Vector3(0, 0, -1);
    spawnTestMissile(
      world,
      'nuke',
      new Vector3(offsetX, 0, stats.aoeRadius + 50),
      direction,
      enemy,
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
      'Nuke should damage player convoy via proximity detonation',
    );
  });

  it('flak projectile detonates near player convoy and spawns shrapnel', () => {
    const world = createTestWorld();

    const enemy = createEnemyWithWeapons(world, new Vector3(0, 0, 200));
    const convoy = createTestConvoy(
      world,
      new Vector3(0, 0, 0),
      Faction.Player,
    );
    const before = getTotalHealth(world, convoy);

    // Spawn flak projectile heading toward convoy
    const weapon = PRIMARY_WEAPONS.flak;
    const direction = new Vector3(0, 0, -1);
    spawnFlakProjectile(
      world,
      new Vector3(0, 0, weapon.flakRadius + 10),
      direction,
      enemy,
    );

    let hitDetected = false;
    let maxProjectilesSeen = 0;

    for (let tick = 0; tick < 300; tick++) {
      runForTicks(world, 1);

      const projectileCount = countProjectiles(world);
      if (projectileCount > maxProjectilesSeen) {
        maxProjectilesSeen = projectileCount;
      }

      const after = getTotalHealth(world, convoy);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
      }

      if (hitDetected && projectileCount === 0) {
        break;
      }
    }

    assert.ok(
      maxProjectilesSeen > 1,
      `Flak should spawn shrapnel near player convoy (max projectiles: ${maxProjectilesSeen})`,
    );
    assert.ok(hitDetected, 'Flak shrapnel should damage player convoy');
  });

  it('starburst missile detonates near player convoy and spawns shrapnel', () => {
    const world = createTestWorld();

    const enemy = createEnemyWithWeapons(world, new Vector3(0, 0, 200));
    const convoy = createTestConvoy(
      world,
      new Vector3(0, 0, 0),
      Faction.Player,
    );
    const before = getTotalHealth(world, convoy);

    // Spawn starburst missile passing near convoy
    const direction = new Vector3(0, 0, -1);
    spawnTestMissile(
      world,
      'starburst',
      new Vector3(30, 0, 170),
      direction,
      enemy,
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

    assert.ok(hitDetected, 'Starburst shrapnel should damage player convoy');
  });
});
