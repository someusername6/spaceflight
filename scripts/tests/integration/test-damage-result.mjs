/**
 * DamageResult tests - validates damage distribution between shields and hull.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createHealth } from '../../../src/components/health.ts';
import { createShields } from '../../../src/components/shields.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '../../../src/core/ecs.ts';
import { dealDamage } from '../../../src/systems/damage.ts';

describe('DamageResult', () => {
  it('shields fully absorb returns 0 hullDamage', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, createTransform(0, 0, 0));
    addComponent(world, entity, createHealth(100));
    addComponent(world, entity, createShields(50, 10, 3)); // 50 shields

    const result = dealDamage(world, entity, 30); // 30 damage < 50 shields
    assert.strictEqual(result.shieldDamage, 30, 'Should absorb 30 to shields');
    assert.strictEqual(result.hullDamage, 0, 'Should deal 0 to hull');

    const health = getComponent(world, entity, 'health');
    const shields = getComponent(world, entity, 'shields');
    assert.strictEqual(health.hull, 100, 'Hull should be unchanged');
    assert.strictEqual(shields.current, 20, 'Shields should be 20');
  });

  it('shields partially absorb returns both damages', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, createTransform(0, 0, 0));
    addComponent(world, entity, createHealth(100));
    addComponent(world, entity, createShields(30, 10, 3)); // 30 shields

    const result = dealDamage(world, entity, 50); // 50 damage > 30 shields
    assert.strictEqual(result.shieldDamage, 30, 'Should absorb 30 to shields');
    assert.strictEqual(result.hullDamage, 20, 'Should deal 20 to hull');

    const health = getComponent(world, entity, 'health');
    const shields = getComponent(world, entity, 'shields');
    assert.strictEqual(health.hull, 80, 'Hull should be 80');
    assert.strictEqual(shields.current, 0, 'Shields should be depleted');
  });

  it('no shields returns all as hullDamage', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, createTransform(0, 0, 0));
    addComponent(world, entity, createHealth(100));
    // No shields component

    const result = dealDamage(world, entity, 40);
    assert.strictEqual(result.shieldDamage, 0, 'Should absorb 0 to shields');
    assert.strictEqual(result.hullDamage, 40, 'Should deal 40 to hull');

    const health = getComponent(world, entity, 'health');
    assert.strictEqual(health.hull, 60, 'Hull should be 60');
  });

  it('depleted shields returns all as hullDamage', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, createTransform(0, 0, 0));
    addComponent(world, entity, createHealth(100));
    const shields = createShields(50, 10, 3);
    shields.current = 0; // Already depleted
    addComponent(world, entity, shields);

    const result = dealDamage(world, entity, 25);
    assert.strictEqual(
      result.shieldDamage,
      0,
      'Should absorb 0 to depleted shields',
    );
    assert.strictEqual(result.hullDamage, 25, 'Should deal 25 to hull');

    const health = getComponent(world, entity, 'health');
    assert.strictEqual(health.hull, 75, 'Hull should be 75');
  });
});
