/**
 * Shrapnel Missile Tests - Verify starburst missiles spawn shrapnel.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { createFaction, Faction } from '../../../src/components/faction.ts';
import { createTransform } from '../../../src/components/transform.ts';
import { addComponent, createEntity } from '../../../src/core/ecs.ts';
import { MISSILES } from '../../../src/data/missiles.ts';
import {
  calculateDamage,
  countMissiles,
  countProjectiles,
  countShrapnel,
  createEnemyConvoy,
  createEnemyShip,
  createEnemyStation,
  createTestWorld,
  getTotalHealth,
  runForTicks,
} from '../shared/weapon-damage-utils.mjs';
import { spawnMissile } from './missile-test-helpers.mjs';

// ============================================================================
// Tests: Shrapnel Missiles (Starburst) - Proximity Detonation
// ============================================================================

describe('Shrapnel Missiles (Starburst) - Proximity Detonation', () => {
  it('starburst proximity detonation spawns shrapnel and damages convoy', () => {
    const world = createTestWorld();
    const stats = MISSILES.starburst;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyConvoy(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const startDist = stats.flakRadius + 50;
    const offsetX = 30;
    const direction = new Vector3(0, 0, -1);
    spawnMissile(
      world,
      'starburst',
      new Vector3(offsetX, 0, startDist),
      direction,
      owner,
      undefined,
    );

    let maxShrapnelSeen = 0;
    let damageDealt = false;

    for (let tick = 0; tick < 300; tick++) {
      runForTicks(world, 1);

      const shrapnelCount = countShrapnel(world);
      if (shrapnelCount > maxShrapnelSeen) {
        maxShrapnelSeen = shrapnelCount;
      }

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        damageDealt = true;
      }

      if (
        damageDealt &&
        countMissiles(world) === 0 &&
        countProjectiles(world) === 0
      ) {
        break;
      }
    }

    assert.ok(
      maxShrapnelSeen >= 40,
      `Starburst proximity should spawn shrapnel (max: ${maxShrapnelSeen})`,
    );
    assert.ok(
      damageDealt,
      'Starburst proximity shrapnel should deal damage to convoy',
    );
  });
});

// ============================================================================
// Tests: Shrapnel Missiles (Starburst) - Collision Detonation
// ============================================================================

describe('Shrapnel Missiles (Starburst) - Collision Detonation', () => {
  it('starburst collision detonation spawns shrapnel and damages convoy', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyConvoy(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const direction = new Vector3(0, 0, -1);
    const startDist = 50;
    spawnMissile(
      world,
      'starburst',
      new Vector3(0, 0, startDist),
      direction,
      owner,
      undefined,
    );

    let maxShrapnelSeen = 0;
    let damageDealt = false;

    for (let tick = 0; tick < 300; tick++) {
      runForTicks(world, 1);

      const shrapnelCount = countShrapnel(world);
      if (shrapnelCount > maxShrapnelSeen) {
        maxShrapnelSeen = shrapnelCount;
      }

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        damageDealt = true;
      }

      if (
        damageDealt &&
        countMissiles(world) === 0 &&
        countProjectiles(world) === 0
      ) {
        break;
      }
    }

    assert.ok(
      maxShrapnelSeen >= 40,
      `Starburst collision should spawn shrapnel (max: ${maxShrapnelSeen})`,
    );
    assert.ok(
      damageDealt,
      'Starburst collision shrapnel should deal damage to convoy',
    );
  });

  it('starburst collision damages enemy ship', () => {
    const world = createTestWorld();
    const stats = MISSILES.starburst;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyShip(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const direction = new Vector3(0, 0, -1);
    spawnMissile(
      world,
      'starburst',
      new Vector3(0, 0, 30),
      direction,
      owner,
      undefined,
    );

    let damageDealt = false;
    for (let tick = 0; tick < 300; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        damageDealt = true;
        break;
      }

      if (
        countMissiles(world) === 0 &&
        countProjectiles(world) === 0 &&
        tick > 60
      ) {
        break;
      }
    }

    assert.ok(damageDealt, `${stats.name} collision should damage enemy ship`);
  });

  it('starburst collision damages enemy station', () => {
    const world = createTestWorld();
    const stats = MISSILES.starburst;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyStation(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const direction = new Vector3(0, 0, -1);
    spawnMissile(
      world,
      'starburst',
      new Vector3(0, 0, 30),
      direction,
      owner,
      undefined,
    );

    let damageDealt = false;
    for (let tick = 0; tick < 300; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        damageDealt = true;
        break;
      }

      if (
        countMissiles(world) === 0 &&
        countProjectiles(world) === 0 &&
        tick > 60
      ) {
        break;
      }
    }

    assert.ok(
      damageDealt,
      `${stats.name} collision should damage enemy station`,
    );
  });
});
