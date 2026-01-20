/**
 * Beam Damage Application Tests - Verify beam damage applies correctly.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { createFaction, Faction } from '../../../src/components/faction.ts';
import { createTransform } from '../../../src/components/transform.ts';
import { addComponent, createEntity } from '../../../src/core/ecs.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import { dealDamage } from '../../../src/systems/damage.ts';
import {
  calculateDamage,
  createEnemyConvoy,
  createEnemyShip,
  createEnemyStation,
  createSimpleTarget,
  createTestWorld,
  getTotalHealth,
} from '../shared/weapon-damage-utils.mjs';

// ============================================================================
// Tests: Beam Damage Application
// ============================================================================

describe('Beam Damage Application vs Ships', () => {
  it('beam damage applies to enemy ship shields', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyShip(world, new Vector3(0, 0, -100));
    const before = getTotalHealth(world, target);

    assert.ok(before.shields > 0, 'Target should have shields');

    const hitPoint = new Vector3(0, 0, -100);
    dealDamage(world, target, 50, hitPoint, 1, 1, owner);

    const after = getTotalHealth(world, target);
    const damage = calculateDamage(before, after);

    assert.ok(damage.totalDamage > 0, 'Beam should deal damage to enemy ship');
    assert.ok(damage.shieldDamage > 0, 'Damage should go to shields first');
  });

  it('beam damage applies to enemy ship hull after shields depleted', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createSimpleTarget(
      world,
      new Vector3(0, 0, -100),
      200,
      10,
      15,
    );
    const before = getTotalHealth(world, target);

    assert.strictEqual(before.shields, 10, 'Target should have 10 shields');

    const hitPoint = new Vector3(0, 0, -100);
    dealDamage(world, target, 100, hitPoint, 1, 1, owner);

    const after = getTotalHealth(world, target);
    const damage = calculateDamage(before, after);

    assert.strictEqual(
      damage.shieldDamage,
      10,
      'All shields should be depleted',
    );
    assert.strictEqual(
      damage.hullDamage,
      90,
      'Remaining damage should go to hull',
    );
  });
});

describe('Beam Damage Application vs Convoys', () => {
  it('beam damage applies to enemy convoy', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyConvoy(world, new Vector3(0, 0, -100));
    const before = getTotalHealth(world, target);

    const hitPoint = new Vector3(0, 0, -100);
    dealDamage(world, target, 50, hitPoint, 1, 1, owner);

    const after = getTotalHealth(world, target);
    const damage = calculateDamage(before, after);

    assert.ok(
      damage.totalDamage > 0,
      'Beam should deal damage to enemy convoy',
    );
  });
});

describe('Beam Damage Application vs Stations', () => {
  it('beam damage applies to enemy station', () => {
    const world = createTestWorld();

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createEnemyStation(world, new Vector3(0, 0, -100));
    const before = getTotalHealth(world, target);

    const hitPoint = new Vector3(0, 0, -100);
    dealDamage(world, target, 50, hitPoint, 1, 1, owner);

    const after = getTotalHealth(world, target);
    const damage = calculateDamage(before, after);

    assert.ok(
      damage.totalDamage > 0,
      'Beam should deal damage to enemy station',
    );
  });
});

// ============================================================================
// Tests: Nuclear Lance Damage
// ============================================================================

describe('Nuclear Lance Damage', () => {
  it('nuclear lance deals massive damage', () => {
    const world = createTestWorld();
    const weapon = PRIMARY_WEAPONS.nuclearLance;

    const owner = createEntity(world);
    addComponent(world, owner, createTransform(0, 0, 0));
    addComponent(world, owner, createFaction(Faction.Player));

    const target = createSimpleTarget(
      world,
      new Vector3(0, 0, -500),
      1000,
      200,
      15,
    );
    const before = getTotalHealth(world, target);

    const hitPoint = new Vector3(0, 0, -500);
    dealDamage(world, target, weapon.damage, hitPoint, 1, 1, owner);

    const after = getTotalHealth(world, target);
    const damage = calculateDamage(before, after);

    assert.strictEqual(
      damage.totalDamage,
      500,
      `Nuclear Lance should deal ${weapon.damage} damage`,
    );
  });
});
