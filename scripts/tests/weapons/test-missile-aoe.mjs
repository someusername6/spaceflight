/**
 * AoE Missile Tests - Verify nuke missiles damage with area of effect.
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
  createEnemyConvoy,
  createEnemyShip,
  createEnemyStation,
  createTestWorld,
  getTotalHealth,
  runForTicks,
} from '../shared/weapon-damage-utils.mjs';
import { spawnMissile } from './missile-test-helpers.mjs';

// ============================================================================
// Tests: AoE Missiles (Nuke) - Collision Detonation
// ============================================================================

describe('AoE Missiles (Nuke) - Collision Detonation', () => {
  it('nuke collision damages enemy ship with AoE', () => {
    const world = createTestWorld();
    const stats = MISSILES.nuke;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyShip(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const direction = new Vector3(0, 0, -1);
    spawnMissile(
      world,
      'nuke',
      new Vector3(0, 0, 50),
      direction,
      owner,
      target,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 600; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }

      if (countMissiles(world) === 0 && tick > 30) {
        break;
      }
    }

    assert.ok(hitDetected, `${stats.name} collision should damage enemy ship`);
  });

  it('nuke collision damages enemy convoy with AoE', () => {
    const world = createTestWorld();
    const stats = MISSILES.nuke;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyConvoy(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const direction = new Vector3(0, 0, -1);
    spawnMissile(
      world,
      'nuke',
      new Vector3(0, 0, 50),
      direction,
      owner,
      target,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 600; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }

      if (countMissiles(world) === 0 && tick > 30) {
        break;
      }
    }

    assert.ok(
      hitDetected,
      `${stats.name} collision should damage enemy convoy`,
    );
  });

  it('nuke collision damages enemy station with AoE', () => {
    const world = createTestWorld();
    const stats = MISSILES.nuke;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyStation(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const direction = new Vector3(0, 0, -1);
    spawnMissile(
      world,
      'nuke',
      new Vector3(0, 0, 50),
      direction,
      owner,
      target,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 600; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }

      if (countMissiles(world) === 0 && tick > 30) {
        break;
      }
    }

    assert.ok(
      hitDetected,
      `${stats.name} collision should damage enemy station`,
    );
  });

  it('nuke collision AoE damages multiple nearby targets', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const primaryTarget = createEnemyShip(world, new Vector3(0, 0, 0));
    const primaryBefore = getTotalHealth(world, primaryTarget);

    const secondaryTarget = createEnemyShip(world, new Vector3(50, 0, 0));
    const secondaryBefore = getTotalHealth(world, secondaryTarget);

    const direction = new Vector3(0, 0, -1);
    spawnMissile(
      world,
      'nuke',
      new Vector3(0, 0, 50),
      direction,
      owner,
      primaryTarget,
    );

    let primaryHit = false;
    let secondaryHit = false;

    for (let tick = 0; tick < 600; tick++) {
      runForTicks(world, 1);

      const primaryAfter = getTotalHealth(world, primaryTarget);
      const secondaryAfter = getTotalHealth(world, secondaryTarget);

      const primaryDamage = calculateDamage(primaryBefore, primaryAfter);
      const secondaryDamage = calculateDamage(secondaryBefore, secondaryAfter);

      if (primaryDamage.totalDamage > 0) primaryHit = true;
      if (secondaryDamage.totalDamage > 0) secondaryHit = true;

      if (primaryHit && secondaryHit) break;

      if (countMissiles(world) === 0 && tick > 30) {
        break;
      }
    }

    assert.ok(primaryHit, 'Nuke should damage primary target on collision');
    assert.ok(
      secondaryHit,
      'Nuke AoE should damage secondary target within radius',
    );
  });
});

// ============================================================================
// Tests: AoE Missiles (Nuke) - Proximity Detonation
// ============================================================================

describe('AoE Missiles (Nuke) - Proximity Detonation', () => {
  it('nuke proximity detonation damages enemy ship with AoE', () => {
    const world = createTestWorld();
    const stats = MISSILES.nuke;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyShip(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const direction = new Vector3(0, 0, -1);
    const offsetX = stats.aoeRadius * 0.5;
    spawnMissile(
      world,
      'nuke',
      new Vector3(offsetX, 0, stats.aoeRadius + 50),
      direction,
      owner,
      target,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 600; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }

      if (countMissiles(world) === 0 && tick > 30) {
        break;
      }
    }

    assert.ok(hitDetected, `${stats.name} proximity should damage enemy ship`);
  });

  it('nuke proximity detonation damages enemy convoy with AoE', () => {
    const world = createTestWorld();
    const stats = MISSILES.nuke;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyConvoy(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const direction = new Vector3(0, 0, -1);
    const offsetX = stats.aoeRadius * 0.5;
    spawnMissile(
      world,
      'nuke',
      new Vector3(offsetX, 0, stats.aoeRadius + 50),
      direction,
      owner,
      target,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 600; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }

      if (countMissiles(world) === 0 && tick > 30) {
        break;
      }
    }

    assert.ok(
      hitDetected,
      `${stats.name} proximity should damage enemy convoy`,
    );
  });

  it('nuke proximity detonation damages enemy station with AoE', () => {
    const world = createTestWorld();
    const stats = MISSILES.nuke;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 200));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyStation(world, new Vector3(0, 0, 0));
    const before = getTotalHealth(world, target);

    const direction = new Vector3(0, 0, -1);
    const offsetX = stats.aoeRadius * 0.5;
    spawnMissile(
      world,
      'nuke',
      new Vector3(offsetX, 0, stats.aoeRadius + 50),
      direction,
      owner,
      target,
    );

    let hitDetected = false;
    for (let tick = 0; tick < 600; tick++) {
      runForTicks(world, 1);

      const after = getTotalHealth(world, target);
      const damage = calculateDamage(before, after);
      if (damage.totalDamage > 0) {
        hitDetected = true;
        break;
      }

      if (countMissiles(world) === 0 && tick > 30) {
        break;
      }
    }

    assert.ok(
      hitDetected,
      `${stats.name} proximity should damage enemy station`,
    );
  });
});
